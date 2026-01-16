const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Rate limiter for authenticated users (per user, not per IP)
const createUserRateLimit = (options = {}) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // 50 requests per user per window
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

module.exports = {
    createUserRateLimit,
    createAuthRateLimit
};
