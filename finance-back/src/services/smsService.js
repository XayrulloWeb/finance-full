const logger = require('../lib/logger');

exports.sendVerificationCode = async (phone, code) => {
    // SMS mock for development: prints code to console.
    logger.info(`[SMS] Verification code for ${phone}: ${code}`);
};
