const logger = require('../lib/logger');

/**
 * Middleware для валидации запросов через Zod schemas
 * @param {ZodSchema} schema - Zod schema для валидации
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Парсим и валидируем body
            const parsed = schema.parse(req.body);
            req.body = parsed; // Заменяем на валидированные и типизированные данные
            next();
        } catch (error) {
            // Логируем ошибку валидации
            logger.warn('Validation failed', {
                path: req.path,
                method: req.method,
                body: req.body,
                errors: error.errors,
                userId: req.user?.id,
                ip: req.ip
            });

            // Безопасная обработка ошибок
            const errorDetails = error.errors && Array.isArray(error.errors)
                ? error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                    received: e.received
                }))
                : [{ field: 'unknown', message: 'Validation failed' }];

            // Возвращаем структурированную ошибку
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                errors: errorDetails
            });
        }
    };
};

module.exports = validate;
