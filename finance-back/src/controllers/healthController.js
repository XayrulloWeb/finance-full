const prisma = require('../lib/prisma');
const { getRedisClient, isRedisAvailable } = require('../lib/redis');
const logger = require('../lib/logger');

exports.checkHealth = async (req, res) => {
    const health = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date(),
        services: {
            database: { status: 'unknown' },
            redis: { status: 'unknown' }
        }
    };

    try {
        // 1. Check Database
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = {
            status: 'up',
            latency: `${Date.now() - dbStart}ms`
        };
    } catch (error) {
        health.status = 'error';
        health.services.database = {
            status: 'down',
            error: error.message
        };
        logger.error('Health Check - DB Failed', { error: error.message });
    }

    try {
        // 2. Check Redis
        const redisStart = Date.now();
        const redisAvailable = await isRedisAvailable();
        if (redisAvailable) {
            const redis = getRedisClient();
            await redis.ping();
            health.services.redis = {
                status: 'up',
                latency: `${Date.now() - redisStart}ms`
            };
        } else {
            health.services.redis = {
                status: 'disabled_or_down',
                message: 'Redis is not connected'
            };
        }
    } catch (error) {
        // Redis failure is often not critical for basic app function, but we report it
        health.services.redis = {
            status: 'error',
            error: error.message
        };
        logger.warn('Health Check - Redis Failed', { error: error.message });
    }

    const statusCode = health.status === 'error' ? 503 : 200;
    res.status(statusCode).json(health);
};
