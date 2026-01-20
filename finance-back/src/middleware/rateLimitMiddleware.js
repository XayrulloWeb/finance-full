const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for authenticated users (per user, not per IP)
const createUserRateLimit = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Increased from 50 to 1000 to match global limit and support dev usage
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' },
        keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res), // Use user ID if authenticated, otherwise IP
        ...options
    };

    return rateLimit(defaultOptions);
};

// Rate limiter for auth endpoints (login/register)
const createAuthRateLimit = () => {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts per IP for auth
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts, please try again later.' }
    });
};

// Stricter rate limiter specifically for login endpoint (brute-force protection)
const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts
    message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        const logger = require('../lib/logger');
        logger.warn('Login rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            phone: req.body?.phone
        });
        res.status(429).json({
            code: 'TOO_MANY_REQUESTS',
            error: 'Слишком много попыток входа. Попробуйте через 15 минут'
        });
    }
});

module.exports = {
    createUserRateLimit,
    createAuthRateLimit,
    loginRateLimit
};
