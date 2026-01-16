const prisma = require('../lib/prisma');

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

        res.json(result);
    } catch (error) {
        console.error('Create Account Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const account = await prisma.account.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await prisma.account.delete({ where: { id: account.id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Account Error:', error);
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
        res.json(account);
    } catch (error) {
        console.error('Update Account Error:', error);
        res.status(500).json({ error: error.message });
    }
};
