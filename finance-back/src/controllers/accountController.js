const prisma = require('../lib/prisma');
const cacheService = require('../services/cacheService');
const logger = require('../lib/logger');

exports.createAccount = async (req, res) => {
    try {
        const { name, currency, color, icon, initialBalance } = req.body;
        const userId = req.user.id;

        // Создаем счет и сразу транзакцию, если есть начальный баланс
        const result = await prisma.$transaction(async (tx) => {
            const account = await tx.account.create({
                data: { user_id: userId, name, currency, color, icon, balance: Number(initialBalance) || 0 }
            });

            if (Number(initialBalance) !== 0) {
                await tx.transaction.create({
                    data: {
                        user_id: userId,
                        account_id: account.id,
                        amount: Math.abs(Number(initialBalance)),
                        type: Number(initialBalance) > 0 ? 'income' : 'expense',
                        comment: 'Начальный остаток',
                        date: new Date()
                    }
                });
            }
            return account;
        });

        // Invalidate cache
        await cacheService.invalidateAfterDataChange(userId);

        res.json(result);
    } catch (error) {
        logger.error('Create Account Error', { error: error.message, userId: req.user.id });
        res.status(500).json({ error: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const account = await prisma.account.findFirst({
            where: { id: req.params.id, user_id: req.user.id, is_hidden: false }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Soft delete: скрываем счет и ставим дату удаления
        await prisma.account.update({
            where: { id: account.id },
            data: {
                is_hidden: true,
                deleted_at: new Date()
            }
        });

        // Invalidate cache
        await cacheService.invalidateAfterDataChange(req.user.id);

        res.json({ success: true });
    } catch (error) {
        logger.error('Delete Account Error', { error: error.message, userId: req.user.id });
        res.status(500).json({ error: error.message });
    }
};

exports.updateAccount = async (req, res) => {
    try {
        const existing = await prisma.account.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = await prisma.account.update({
            where: { id: existing.id },
            data: req.body
        });

        // Invalidate cache
        await cacheService.invalidateAfterDataChange(req.user.id);

        res.json(account);
    } catch (error) {
        logger.error('Update Account Error', { error: error.message, userId: req.user.id });
        res.status(500).json({ error: error.message });
    }
};
