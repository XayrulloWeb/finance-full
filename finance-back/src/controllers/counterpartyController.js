const prisma = require('../lib/prisma');

exports.getCounterparties = async (req, res) => {
    try {
        const data = await prisma.counterparty.findMany({
            where: { user_id: req.user.id },
            orderBy: { name: 'asc' }
        });
        res.json(data);
    } catch (error) {
        console.error('Get Counterparties Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createCounterparty = async (req, res) => {
    try {
        const data = await prisma.counterparty.create({
            data: { ...req.body, user_id: req.user.id }
        });
        res.json(data);
    } catch (error) {
        console.error('Create Counterparty Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateCounterparty = async (req, res) => {
    try {
        const existing = await prisma.counterparty.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Counterparty not found' });
        }

        const data = await prisma.counterparty.update({
            where: { id: existing.id },
            data: req.body
        });
        res.json(data);
    } catch (error) {
        console.error('Update Counterparty Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCounterparty = async (req, res) => {
    try {
        const existing = await prisma.counterparty.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Counterparty not found' });
        }

        await prisma.counterparty.delete({
            where: { id: existing.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Counterparty Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const cp = await prisma.counterparty.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
        if (!cp) return res.status(404).json({ error: 'Counterparty not found' });
        
        const data = await prisma.counterparty.update({
            where: { id: req.params.id },
            data: { is_favorite: !cp.is_favorite }
        });
        res.json(data);
    } catch (error) {
        console.error('Toggle Favorite Error:', error);
        res.status(500).json({ error: error.message });
    }
};
