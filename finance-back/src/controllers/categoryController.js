const prisma = require('../lib/prisma');

exports.createCategory = async (req, res) => {
    try {
        const category = await prisma.category.create({
            data: { ...req.body, user_id: req.user.id }
        });
        res.json(category);
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const category = await prisma.category.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await prisma.category.delete({ where: { id: category.id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({ error: error.message });
    }
};
