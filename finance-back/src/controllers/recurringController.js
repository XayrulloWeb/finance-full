const prisma = require('../lib/prisma');
const { ensureOptionalAccountOwnership, ensureOptionalCategoryOwnership } = require('../lib/ownership');

exports.getRecurring = async (req, res) => {
    try {
        const data = await prisma.recurringTransaction.findMany({
            where: { user_id: req.user.id },
            orderBy: { day_of_month: 'asc' }
        });
        res.json(data);
    } catch (error) {
        console.error('Get Recurring Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createRecurring = async (req, res) => {
    try {
        const { amount, day_of_month, category_id, account_id, ...rest } = req.body;
        await ensureOptionalAccountOwnership(req.user.id, account_id, prisma);
        await ensureOptionalCategoryOwnership(req.user.id, category_id, prisma);

        const data = await prisma.recurringTransaction.create({
            data: { 
                ...rest, 
                amount: Number(amount) || 0,
                day_of_month: Number(day_of_month) || 1,
                category_id: category_id || null,
                account_id: account_id || null,
                user_id: req.user.id 
            }
        });
        res.json(data);
    } catch (error) {
        console.error('Create Recurring Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.updateRecurring = async (req, res) => {
    try {
        const { amount, day_of_month, category_id, account_id, ...rest } = req.body;
        const updateData = { ...rest };
        if (amount !== undefined) updateData.amount = Number(amount) || 0;
        if (day_of_month !== undefined) updateData.day_of_month = Number(day_of_month) || 1;
        if (category_id !== undefined) updateData.category_id = category_id || null;
        if (account_id !== undefined) updateData.account_id = account_id || null;

        const existing = await prisma.recurringTransaction.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Recurring transaction not found' });
        }

        if (account_id !== undefined) {
            await ensureOptionalAccountOwnership(req.user.id, account_id, prisma);
        }
        if (category_id !== undefined) {
            await ensureOptionalCategoryOwnership(req.user.id, category_id, prisma);
        }

        const data = await prisma.recurringTransaction.update({
            where: { id: existing.id },
            data: updateData
        });
        res.json(data);
    } catch (error) {
        console.error('Update Recurring Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRecurring = async (req, res) => {
    try {
        const existing = await prisma.recurringTransaction.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Recurring transaction not found' });
        }

        await prisma.recurringTransaction.delete({
            where: { id: existing.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Recurring Error:', error);
        res.status(500).json({ error: error.message });
    }
};
