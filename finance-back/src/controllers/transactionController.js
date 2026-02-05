const prisma = require('../lib/prisma');
const BalanceService = require('../services/balanceService');
const cacheService = require('../services/cacheService');
const budgetAlertService = require('../services/budgetAlertService');
const { ensureAccountOwnership, ensureOptionalCategoryOwnership, ensureOptionalCounterpartyOwnership } = require('../lib/ownership');

// Получение списка транзакций (с фильтрами и пагинацией)
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 0, limit = 50, type, account_id, category_id, startDate, endDate, dateFrom, dateTo, search } = req.query;

        const where = {
            user_id: userId,
            is_removed: false
        };

        // Фильтры: игнорируем "all"
        if (type && type !== 'all') {
            if (type === 'transfer') {
                where.OR = [
                    { type: 'transfer_in' },
                    { type: 'transfer_out' }
                ];
            } else {
                where.type = type;
            }
        }

        if (account_id && account_id !== 'all') where.account_id = account_id;
        if (category_id && category_id !== 'all') where.category_id = category_id;

        // Фильтры по сумме (новое в Phase 4)
        if (req.query.minAmount) {
            where.amount = { ...where.amount, gte: Number(req.query.minAmount) };
        }
        if (req.query.maxAmount) {
            where.amount = { ...where.amount, lte: Number(req.query.maxAmount) };
        }

        // Поиск по комментарию
        if (search) {
            where.comment = {
                contains: search,
                mode: 'insensitive'
            };
        }

        // Даты (поддерживаем оба варианта именования)
        const dFrom = dateFrom || startDate;
        const dTo = dateTo || endDate;

        if (dFrom || dTo) {
            where.date = {};
            if (dFrom) where.date.gte = new Date(dFrom);
            if (dTo) {
                const end = new Date(dTo);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const [data, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: Number(page) * Number(limit),
                take: Number(limit)
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get Txs Error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Создание обычной транзакции (Доход/Расход)
exports.createTransaction = async (req, res) => {
    try {
        const { account_id, category_id, counterparty_id, amount, type, comment, date } = req.body;
        const userId = req.user.id;
        const valAmount = Number(amount) || 0;

        // Input validation
        if (valAmount <= 0 || valAmount > 1e10) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        // Validate date (not in future, not too old)
        const txDate = date ? new Date(date) : new Date();
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        if (txDate > now || txDate < oneWeekAgo) {
            return res.status(400).json({ error: 'Invalid date' });
        }

        const result = await prisma.$transaction(async (tx) => {
            await ensureAccountOwnership(userId, account_id, tx);
            await ensureOptionalCategoryOwnership(userId, category_id, tx);
            await ensureOptionalCounterpartyOwnership(userId, counterparty_id, tx);
            // 1. Создаем запись
            const newTx = await tx.transaction.create({
                data: {
                    user_id: userId,
                    account_id,
                    category_id: category_id || null,
                    counterparty_id: counterparty_id || null,
                    amount: valAmount,
                    type,
                    comment,
                    date: txDate
                }
            });

            // 2. Обновляем баланс счета через BalanceService
            await BalanceService.updateBalanceChecked(tx, account_id, valAmount, type);

            return newTx;
        });

        // Check budget limits (async, don't block response too much? actually await is fine)
        if (result && result.type === 'expense' && result.category_id) {
            await budgetAlertService.checkBudgetLimits(userId, result.category_id, result.amount, result.date);
        }

        res.json(result);
    } catch (error) {
        console.error('Create Tx Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(500).json({ error: 'Transaction failed', details: error.message, code: error.code, meta: error.meta });
    }
};

// Сложный перевод между счетами (Transfer)
exports.performTransfer = async (req, res) => {
    try {
        const { from_account_id, to_account_id, amount, comment, date } = req.body;
        const userId = req.user.id;
        const valAmount = Number(amount) || 0;

        // Input validation
        if (valAmount <= 0 || valAmount > 1e10) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (from_account_id === to_account_id) {
            return res.status(400).json({ error: 'Cannot transfer to the same account' });
        }

        // Validate date
        const txDate = date ? new Date(date) : new Date();
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        if (txDate > now || txDate < oneWeekAgo) {
            return res.status(400).json({ error: 'Invalid date' });
        }

        const result = await prisma.$transaction(async (tx) => {
            await ensureAccountOwnership(userId, from_account_id, tx);
            await ensureAccountOwnership(userId, to_account_id, tx);

            await BalanceService.updateBalanceChecked(tx, from_account_id, valAmount, 'transfer_out');

            // 1. Списание (Transfer Out)
            const txOut = await tx.transaction.create({
                data: {
                    user_id: userId,
                    account_id: from_account_id,
                    amount: valAmount,
                    type: 'transfer_out',
                    comment: comment || 'Перевод',
                    date: txDate
                }
            });

            // 2. Обновление баланса Отправителя

            // 3. Зачисление (Transfer In)
            const txIn = await tx.transaction.create({
                data: {
                    user_id: userId,
                    account_id: to_account_id,
                    amount: valAmount,
                    type: 'transfer_in',
                    comment: comment || 'Перевод',
                    date: txDate
                }
            });

            // 4. Обновление баланса Получателя
            await BalanceService.updateBalance(tx, to_account_id, valAmount, 'transfer_in');

            return { success: true, txOut, txIn };
        });

        res.json(result);
    } catch (error) {
        console.error('Transfer Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(500).json({ error: 'Transfer failed' });
    }
};
// Удаление транзакции
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await prisma.$transaction(async (tx) => {
            const txToDelete = await tx.transaction.findFirst({
                where: { id, user_id: userId, is_removed: false }
            });

            if (!txToDelete) {
                const notFoundError = new Error('Transaction not found');
                notFoundError.code = 'NOT_FOUND';
                throw notFoundError;
            }

            // Обновляем баланс в обратную сторону через BalanceService
            const rollbackIncrement = -BalanceService.calculateIncrement(Number(txToDelete.amount), txToDelete.type);
            if (rollbackIncrement !== 0) {
                await tx.account.update({
                    where: { id: txToDelete.account_id },
                    data: { balance: { increment: rollbackIncrement } }
                });
            }

            await tx.transaction.update({
                where: { id },
                data: { is_removed: true, removed_at: new Date() }
            });
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Tx Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Delete failed' });
    }
};

// Обновление транзакции
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, comment, date, category_id, counterparty_id, account_id } = req.body;
        const userId = req.user.id;

        if (amount !== undefined) {
            const valAmount = Number(amount);
            if (!Number.isFinite(valAmount) || valAmount <= 0 || valAmount > 1e10) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
        }

        if (type !== undefined) {
            const allowedTypes = ['income', 'expense', 'transfer_in', 'transfer_out'];
            if (!allowedTypes.includes(type)) {
                return res.status(400).json({ error: 'Invalid transaction type' });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const oldTx = await tx.transaction.findFirst({
                where: { id, user_id: userId, is_removed: false }
            });

            if (!oldTx) {
                const notFoundError = new Error('Transaction not found');
                notFoundError.code = 'NOT_FOUND';
                throw notFoundError;
            }

            if (account_id !== undefined && account_id) {
                await ensureAccountOwnership(userId, account_id, tx);
            }
            if (category_id !== undefined) {
                await ensureOptionalCategoryOwnership(userId, category_id, tx);
            }
            if (counterparty_id !== undefined) {
                await ensureOptionalCounterpartyOwnership(userId, counterparty_id, tx);
            }

            // Если сумма или тип изменились, нужно корректировать баланс счета
            const oldAmount = Number(oldTx.amount);
            const newAmount = amount !== undefined ? Number(amount) : oldAmount;

            // Упрощенная логика: откатываем старое, применяем новое
            const finalType = type || oldTx.type;
            const finalAccountId = account_id ? account_id : oldTx.account_id;

            const oldIncrement = BalanceService.calculateIncrement(oldAmount, oldTx.type);
            const newIncrement = BalanceService.calculateIncrement(newAmount, finalType);

            const applyIncrement = async (accountId, increment) => {
                if (increment === 0) return;
                if (increment > 0) {
                    await BalanceService.updateBalanceChecked(tx, accountId, increment, 'income');
                } else {
                    await BalanceService.updateBalanceChecked(tx, accountId, Math.abs(increment), 'expense');
                }
            };

            if (oldTx.account_id === finalAccountId) {
                const netIncrement = -oldIncrement + newIncrement;
                await applyIncrement(oldTx.account_id, netIncrement);
            } else {
                await applyIncrement(oldTx.account_id, -oldIncrement);
                await applyIncrement(finalAccountId, newIncrement);
            }

            return await tx.transaction.update({
                where: { id },
                data: {
                    amount: newAmount,
                    type: finalType,
                    account_id: finalAccountId,
                    comment: comment !== undefined ? comment : oldTx.comment,
                    date: date ? new Date(date) : oldTx.date,
                    category_id: category_id !== undefined ? (category_id || null) : oldTx.category_id,
                    counterparty_id: counterparty_id !== undefined ? (counterparty_id || null) : oldTx.counterparty_id
                }
            });
        });

        // Check budget limits if it's an expense and has category
        if (result && result.type === 'expense' && result.category_id) {
            await budgetAlertService.checkBudgetLimits(userId, result.category_id, result.amount, result.date);
        }

        res.json(result);
    } catch (error) {
        console.error('Update Tx Error:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Update failed' });
    }
};
