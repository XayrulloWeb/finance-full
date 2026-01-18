const { PrismaClient } = require('@prisma/client');
const logger = require('../lib/logger');

const prisma = new PrismaClient();

/**
 * POST /api/debt-requests
 * Создать запрос на долг и отправить другу
 */
exports.createDebtRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        let { receiver_email, amount, debt_type, name, notes, due_date } = req.body;

        // Normalize email
        if (receiver_email) receiver_email = receiver_email.toLowerCase().trim();
        const userEmail = req.user.email.toLowerCase();

        // 1. Проверить что не отправляем себе
        if (receiver_email === userEmail) {
            return res.status(400).json({
                code: 'INVALID_REQUEST',
                error: 'Cannot send debt request to yourself'
            });
        }

        // 2. Найти получателя по email
        const receiver = await prisma.user.findUnique({
            where: { email: receiver_email },
            select: { id: true, email: true, status: true }
        });

        if (!receiver) {
            return res.status(404).json({
                code: 'USER_NOT_FOUND',
                error: 'User with this email not found'
            });
        }

        if (receiver.status !== 'active') {
            return res.status(400).json({
                code: 'USER_INACTIVE',
                error: 'Cannot send request to inactive user'
            });
        }

        // 3. Проверка на дубликаты (fraud detection)
        const existingRequest = await prisma.debtRequest.findFirst({
            where: {
                sender_id: userId,
                receiver_email,
                status: 'pending',
                amount,
                name
            }
        });

        if (existingRequest) {
            return res.status(400).json({
                code: 'DUPLICATE_REQUEST',
                error: 'Similar pending request already exists'
            });
        }

        // 4. Создать запрос с expires_at (7 дней)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const debtRequest = await prisma.debtRequest.create({
            data: {
                sender_id: userId,
                receiver_email,
                receiver_id: receiver.id,
                amount,
                debt_type,
                name,
                notes,
                due_date: due_date ? new Date(due_date) : null,
                expires_at: expiresAt
            },
            include: {
                sender: {
                    select: { id: true, email: true }
                },
                receiver: {
                    select: { id: true, email: true }
                }
            }
        });

        // 5. Создать notification для получателя
        await prisma.notification.create({
            data: {
                user_id: receiver.id,
                title: 'New Debt Request',
                message: `${req.user.email} sent you a debt request for ${amount}`,
                type: 'info',
                related_id: debtRequest.id,
                related_type: 'debt_request'
            }
        });

        // TODO: 6. Email notification через emailService
        // TODO: 7. Real-time notification через WebSocket

        logger.info('Debt request created', {
            requestId: debtRequest.id,
            sender: userId,
            receiver: receiver.id
        });

        res.status(201).json(debtRequest);
    } catch (error) {
        logger.error('Create debt request error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to create debt request'
        });
    }
};

/**
 * GET /api/debt-requests/incoming
 * Получить входящие запросы
 */
exports.getIncomingRequests = async (req, res) => {
    try {
        const userEmail = req.user.email.toLowerCase(); // Normalized

        const requests = await prisma.debtRequest.findMany({
            where: {
                receiver_email: userEmail,
                status: 'pending',
                receiver_is_deleted: false
            },
            include: {
                sender: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        logger.error('Get incoming requests error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to fetch incoming requests'
        });
    }
};

/**
 * GET /api/debt-requests/outgoing
 * Получить исходящие запросы
 */
exports.getOutgoingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await prisma.debtRequest.findMany({
            where: {
                sender_id: userId,
                sender_is_deleted: false
            },
            include: {
                receiver: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        logger.error('Get outgoing requests error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to fetch outgoing requests'
        });
    }
};

/**
 * POST /api/debt-requests/:id/accept
 * Подтвердить запрос на долг
 */
exports.acceptDebtRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // 1. Найти request и проверить права
        const request = await prisma.debtRequest.findUnique({
            where: { id },
            include: {
                sender: { select: { id: true, email: true } },
                receiver: { select: { id: true, email: true } }
            }
        });

        if (!request) {
            return res.status(404).json({
                code: 'NOT_FOUND',
                error: 'Debt request not found'
            });
        }

        if (request.receiver_id !== userId) {
            return res.status(403).json({
                code: 'FORBIDDEN',
                error: 'You are not authorized to accept this request'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                code: 'INVALID_STATUS',
                error: `Request is already ${request.status}`
            });
        }

        // 2. Транзакция для создания связанных долгов
        const result = await prisma.$transaction(async (tx) => {
            // Определяем типы долгов
            // Если sender говорит "owes_me", значит receiver должен ему (i_owe для receiver)
            const senderDebtType = request.debt_type;
            const receiverDebtType = request.debt_type === 'owes_me' ? 'i_owe' : 'owes_me';

            // 3. Создать два зеркальных долга
            const debtA = await tx.debt.create({
                data: {
                    user_id: request.sender_id,
                    name: request.name,
                    amount: request.amount,
                    paid_amount: 0,
                    type: senderDebtType,
                    due_date: request.due_date,
                    notes: request.notes,
                    is_linked: true,
                    partner_user_id: request.receiver_id
                }
            });

            const debtB = await tx.debt.create({
                data: {
                    user_id: request.receiver_id,
                    name: request.name,
                    amount: request.amount,
                    paid_amount: 0,
                    type: receiverDebtType,
                    due_date: request.due_date,
                    notes: request.notes,
                    is_linked: true,
                    partner_user_id: request.sender_id
                }
            });

            // 4. Создать LinkedDebt
            const linkedDebt = await tx.linkedDebt.create({
                data: {
                    user_a_id: request.sender_id,
                    debt_a_id: debtA.id,
                    user_b_id: request.receiver_id,
                    debt_b_id: debtB.id,
                    original_amount: request.amount,
                    current_amount: request.amount
                }
            });

            // Обновить debt записи с linked_debt_id
            await tx.debt.update({
                where: { id: debtA.id },
                data: { linked_debt_id: linkedDebt.id }
            });

            await tx.debt.update({
                where: { id: debtB.id },
                data: { linked_debt_id: linkedDebt.id }
            });

            // 5. Обновить request
            const updatedRequest = await tx.debtRequest.update({
                where: { id },
                data: {
                    status: 'accepted',
                    responded_at: new Date(),
                    linked_debt_id: linkedDebt.id
                }
            });

            // 6. Создать DebtActivity
            await tx.debtActivity.create({
                data: {
                    linked_debt_id: linkedDebt.id,
                    user_id: userId,
                    action_type: 'created',
                    amount: request.amount,
                    note: 'Debt request accepted and linked debt created'
                }
            });

            // 7. Notification для sender
            await tx.notification.create({
                data: {
                    user_id: request.sender_id,
                    title: 'Debt Request Accepted',
                    message: `${request.receiver.email} accepted your debt request`,
                    type: 'success',
                    related_id: linkedDebt.id,
                    related_type: 'linked_debt'
                }
            });

            return { updatedRequest, linkedDebt, debtA, debtB };
        });

        logger.info('Debt request accepted', {
            requestId: id,
            linkedDebtId: result.linkedDebt.id
        });

        // TODO: Real-time event

        res.json(result);
    } catch (error) {
        logger.error('Accept debt request error', { error: error.message, stack: error.stack });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to accept debt request'
        });
    }
};

/**
 * POST /api/debt-requests/:id/reject
 * Отклонить запрос
 */
exports.rejectDebtRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const request = await prisma.debtRequest.findUnique({
            where: { id },
            include: { sender: { select: { id: true, email: true } } }
        });

        if (!request) {
            return res.status(404).json({
                code: 'NOT_FOUND',
                error: 'Debt request not found'
            });
        }

        if (request.receiver_id !== userId) {
            return res.status(403).json({
                code: 'FORBIDDEN',
                error: 'You are not authorized to reject this request'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                code: 'INVALID_STATUS',
                error: `Request is already ${request.status}`
            });
        }

        const updatedRequest = await prisma.debtRequest.update({
            where: { id },
            data: {
                status: 'rejected',
                rejection_reason: reason,
                responded_at: new Date()
            }
        });

        // Notification для sender
        await prisma.notification.create({
            data: {
                user_id: request.sender_id,
                title: 'Debt Request Rejected',
                message: `Your debt request was rejected${reason ? `: ${reason}` : ''}`,
                type: 'warning',
                related_id: id,
                related_type: 'debt_request'
            }
        });

        logger.info('Debt request rejected', { requestId: id });

        res.json(updatedRequest);
    } catch (error) {
        logger.error('Reject debt request error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to reject debt request'
        });
    }
};

/**
 * DELETE /api/debt-requests/:id
 * Отменить запрос (только sender, только pending)
 */
exports.cancelDebtRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const request = await prisma.debtRequest.findUnique({
            where: { id }
        });

        if (!request) {
            return res.status(404).json({
                code: 'NOT_FOUND',
                error: 'Debt request not found'
            });
        }

        const isSender = request.sender_id === userId;
        const isReceiver = request.receiver_id === userId || request.receiver_email === req.user.email;

        if (!isSender && !isReceiver) {
            return res.status(403).json({
                code: 'FORBIDDEN',
                error: 'You are not authorized to manage this request'
            });
        }

        // Logic for Pending requests (Cancellation)
        if (request.status === 'pending') {
            if (!isSender) {
                return res.status(403).json({
                    code: 'FORBIDDEN',
                    error: 'Only sender can cancel a pending request'
                });
            }
            const updatedRequest = await prisma.debtRequest.update({
                where: { id },
                data: { status: 'cancelled' }
            });
            logger.info('Debt request cancelled', { requestId: id });
            return res.json(updatedRequest);
        }

        // Logic for Finalized requests (Deletion/Cleanup)
        else {
            // Soft delete: hide from the user who requested deletion
            const dataToUpdate = {};
            if (isSender) dataToUpdate.sender_is_deleted = true;
            if (isReceiver) dataToUpdate.receiver_is_deleted = true;

            await prisma.debtRequest.update({
                where: { id },
                data: dataToUpdate
            });

            // If both deleted, maybe hard delete? (Optional optimization)

            logger.info('Debt request soft deleted', { requestId: id, userId });
            return res.json({ success: true, message: 'Request removed from history' });
        }

    } catch (error) {
        logger.error('Cancel/Delete debt request error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to process request'
        });
    }
};

/**
 * GET /api/debt-requests/stats
 * Статистика по запросам
 */
exports.getRequestStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        const [outgoingStats, incomingStats] = await Promise.all([
            prisma.debtRequest.groupBy({
                by: ['status'],
                where: { sender_id: userId },
                _count: true
            }),
            prisma.debtRequest.groupBy({
                by: ['status'],
                where: { receiver_email: userEmail },
                _count: true
            })
        ]);

        const stats = {
            outgoing: outgoingStats.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {}),
            incoming: incomingStats.reduce((acc, item) => {
                acc[item.status] = item._count;
                return acc;
            }, {})
        };

        res.json(stats);
    } catch (error) {
        logger.error('Get request stats error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to fetch stats'
        });
    }
};

/**
 * GET /api/linked-debts/:id/activity
 * Получить историю активности связанного долга
 */
exports.getLinkedDebtActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Проверить что пользователь участник долга
        const linkedDebt = await prisma.linkedDebt.findUnique({
            where: { id },
            select: { user_a_id: true, user_b_id: true }
        });

        if (!linkedDebt) {
            return res.status(404).json({
                code: 'NOT_FOUND',
                error: 'Linked debt not found'
            });
        }

        if (linkedDebt.user_a_id !== userId && linkedDebt.user_b_id !== userId) {
            return res.status(403).json({
                code: 'FORBIDDEN',
                error: 'You are not a participant of this debt'
            });
        }

        const activities = await prisma.debtActivity.findMany({
            where: { linked_debt_id: id },
            include: {
                user: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(activities);
    } catch (error) {
        logger.error('Get linked debt activity error', { error: error.message });
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            error: 'Failed to fetch activity'
        });
    }
};
