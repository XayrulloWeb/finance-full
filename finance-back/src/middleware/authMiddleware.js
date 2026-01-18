const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Auth failed: No token provided', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({
                code: 'NO_TOKEN',
                error: 'Unauthorized: No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Проверяем, существует ли юзер в базе (защита от "зомби-токенов")
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            logger.warn('Auth failed: User not found', {
                userId: decoded.userId,
                ip: req.ip
            });
            return res.status(401).json({
                code: 'USER_NOT_FOUND',
                error: 'Unauthorized: User not found'
            });
        }

        if (user.status && user.status !== 'active') {
            logger.warn('Auth failed: User not active', {
                userId: user.id,
                status: user.status,
                ip: req.ip
            });
            return res.status(403).json({
                code: 'USER_INACTIVE',
                error: 'Forbidden: User is not active'
            });
        }

        // Добавляем ID и Email юзера в запрос
        req.user = { id: user.id, email: user.email, role: user.role };

        next();
    } catch (error) {
        logger.error('Auth Error', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            path: req.path
        });
        return res.status(403).json({
            code: 'INVALID_TOKEN',
            error: 'Forbidden: Invalid token'
        });
    }
};

module.exports = authMiddleware;
