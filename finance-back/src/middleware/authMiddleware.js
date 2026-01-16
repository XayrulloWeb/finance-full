const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Проверяем, существует ли юзер в базе (защита от "зомби-токенов")
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        if (user.status && user.status !== 'active') {
            return res.status(403).json({ error: 'Forbidden: User is not active' });
        }

        // Добавляем ID юзера в запрос
        req.user = { id: user.id, role: user.role };

        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
};

module.exports = authMiddleware;
