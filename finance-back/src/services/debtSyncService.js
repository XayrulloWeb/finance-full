const { PrismaClient } = require('@prisma/client');
const logger = require('../lib/logger');

const prisma = new PrismaClient();

/**
 * Синхронизировать оплату долга между пользователями
 * @param {string} debtId - ID долга который оплачивают
 * @param {number} paymentAmount - Сумма оплаты
 * @param {string} userId - ID пользователя который оплачивает
 */
exports.syncDebtPayment = async (debtId, paymentAmount, userId) => {
    try {
        // 1. Найти долг и LinkedDebt
        const debt = await prisma.debt.findUnique({
            where: { id: debtId },
            include: {
                linked_debt_a: true,
                linked_debt_b: true
            }
        });

        if (!debt || !debt.is_linked) {
            throw new Error('Debt is not linked');
        }

        const linkedDebt = debt.linked_debt_a || debt.linked_debt_b;

        if (!linkedDebt) {
            throw new Error('LinkedDebt not found');
        }

        // 2. Определить partner debt
        const partnerDebtId = linkedDebt.debt_a_id === debtId
            ? linkedDebt.debt_b_id
            : linkedDebt.debt_a_id;

        const partnerUserId = linkedDebt.user_a_id === userId
            ? linkedDebt.user_b_id
            : linkedDebt.user_a_id;

        // 3. Транзакция для синхронизации
        await prisma.$transaction(async (tx) => {
            // Обновить оба долга
            const newPaidAmount = Number(debt.paid_amount) + Number(paymentAmount);

            await tx.debt.update({
                where: { id: debtId },
                data: {
                    paid_amount: newPaidAmount,
                    is_closed: newPaidAmount >= Number(debt.amount)
                }
            });

            await tx.debt.update({
                where: { id: partnerDebtId },
                data: {
                    paid_amount: newPaidAmount,
                    is_closed: newPaidAmount >= Number(debt.amount)
                }
            });

            // 4. Обновить LinkedDebt
            const newCurrentAmount = Number(linkedDebt.current_amount) - Number(paymentAmount);
            const isSettled = newCurrentAmount <= 0;

            await tx.linkedDebt.update({
                where: { id: linkedDebt.id },
                data: {
                    current_amount: Math.max(0, newCurrentAmount),
                    is_settled: isSettled,
                    settled_at: isSettled ? new Date() : null
                }
            });

            // 5. Создать DebtActivity
            await tx.debtActivity.create({
                data: {
                    linked_debt_id: linkedDebt.id,
                    user_id: userId,
                    action_type: isSettled ? 'settled' : 'payment',
                    amount: paymentAmount,
                    note: `Payment of ${paymentAmount}${isSettled ? '. Debt fully settled!' : ''}`
                }
            });

            // 6. Notification для партнера
            await tx.notification.create({
                data: {
                    user_id: partnerUserId,
                    title: isSettled ? 'Debt Settled!' : 'Debt Payment Received',
                    message: isSettled
                        ? `Your linked debt has been fully settled!`
                        : `Partner paid ${paymentAmount}. Remaining: ${newCurrentAmount}`,
                    type: isSettled ? 'success' : 'info',
                    related_id: linkedDebt.id,
                    related_type: 'linked_debt'
                }
            });
        });

        logger.info('Debt payment synced', {
            linkedDebtId: linkedDebt.id,
            amount: paymentAmount,
            userId
        });

        return { success: true, linkedDebtId: linkedDebt.id };
    } catch (error) {
        logger.error('Sync debt payment error', { error: error.message });
        throw error;
    }
};

/**
 * Синхронизировать изменение долга
 * @param {string} debtId - ID долга
 * @param {object} updates - Обновления
 * @param {string} userId - ID пользователя
 */
exports.syncDebtUpdate = async (debtId, updates, userId) => {
    try {
        const debt = await prisma.debt.findUnique({
            where: { id: debtId },
            include: {
                linked_debt_a: true,
                linked_debt_b: true
            }
        });

        if (!debt || !debt.is_linked) {
            throw new Error('Debt is not linked');
        }

        const linkedDebt = debt.linked_debt_a || debt.linked_debt_b;
        const partnerDebtId = linkedDebt.debt_a_id === debtId
            ? linkedDebt.debt_b_id
            : linkedDebt.debt_a_id;

        const partnerUserId = linkedDebt.user_a_id === userId
            ? linkedDebt.user_b_id
            : linkedDebt.user_a_id;

        await prisma.$transaction(async (tx) => {
            // Обновить оба долга
            await tx.debt.update({
                where: { id: partnerDebtId },
                data: updates
            });

            // Логировать изменение
            await tx.debtActivity.create({
                data: {
                    linked_debt_id: linkedDebt.id,
                    user_id: userId,
                    action_type: 'edited',
                    metadata: updates
                }
            });

            // Notification партнеру
            await tx.notification.create({
                data: {
                    user_id: partnerUserId,
                    title: 'Linked Debt Updated',
                    message: 'Partner updated the linked debt details',
                    type: 'info',
                    related_id: linkedDebt.id,
                    related_type: 'linked_debt'
                }
            });
        });

        logger.info('Debt update synced', { linkedDebtId: linkedDebt.id });
        return { success: true };
    } catch (error) {
        logger.error('Sync debt update error', { error: error.message });
        throw error;
    }
};

/**
 * Синхронизировать удаление долга
 * @param {string} debtId - ID долга
 * @param {string} userId - ID пользователя
 */
exports.syncDebtDeletion = async (debtId, userId) => {
    try {
        const debt = await prisma.debt.findUnique({
            where: { id: debtId },
            include: {
                linked_debt_a: true,
                linked_debt_b: true
            }
        });

        if (!debt || !debt.is_linked) {
            throw new Error('Debt is not linked');
        }

        const linkedDebt = debt.linked_debt_a || debt.linked_debt_b;
        const partnerDebtId = linkedDebt.debt_a_id === debtId
            ? linkedDebt.debt_b_id
            : linkedDebt.debt_a_id;

        const partnerUserId = linkedDebt.user_a_id === userId
            ? linkedDebt.user_b_id
            : linkedDebt.user_a_id;

        await prisma.$transaction(async (tx) => {
            // Пометить оба долга как удаленные (soft delete)
            const now = new Date();

            await tx.debt.update({
                where: { id: partnerDebtId },
                data: {
                    is_removed: true,
                    removed_at: now
                }
            });

            // Notification партнеру
            await tx.notification.create({
                data: {
                    user_id: partnerUserId,
                    title: 'Linked Debt Removed',
                    message: 'Partner removed the linked debt',
                    type: 'warning',
                    related_id: linkedDebt.id,
                    related_type: 'linked_debt'
                }
            });
        });

        logger.info('Debt deletion synced', { linkedDebtId: linkedDebt.id });
        return { success: true };
    } catch (error) {
        logger.error('Sync debt deletion error', { error: error.message });
        throw error;
    }
};
