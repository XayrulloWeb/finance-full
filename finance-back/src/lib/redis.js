const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

/**
 * Get or create Redis client singleton
 * @returns {Redis} Redis client instance
 */
function getRedisClient() {
    if (!redisClient) {
        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                // If we've retried 5 times and we are in dev, likely no Redis. Stop.
                if (times > 5 && process.env.NODE_ENV === 'development') {
                    return null; // Stop retrying
                }
                // Exponential backoff with max 2s delay
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false // Connect immediately
        };

        logger.info('Initializing Redis client...');
        redisClient = new Redis(redisConfig);

        redisClient.on('connect', () => {
            logger.info('Redis connected', {
                host: redisConfig.host,
                port: redisConfig.port
            });
        });

        redisClient.on('ready', () => {
            logger.info('Redis ready to accept commands');
        });

        redisClient.on('error', (err) => {
            // Suppress error logging if it's just a connection refusal in dev environment without Redis
            // but log connection errors otherwise
            if (err.code === 'ECONNREFUSED') {
                logger.warn('Redis connection refused - caching will be disabled');
            } else {
                logger.error('Redis error', { error: err.message, stack: err.stack });
            }
        });

        redisClient.on('close', () => {
            logger.warn('Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis reconnecting...');
        });
    }

    return redisClient;
}

/**
 * Check if Redis is available
 * @returns {Promise<boolean>}
 */
async function isRedisAvailable() {
    try {
        const client = getRedisClient();
        // Simple PING to check responsiveness
        await client.ping();
        return true;
    } catch (error) {
        // If ping fails or client is not connected
        return false;
    }
}

/**
 * Gracefully close Redis connection
 */
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed gracefully');
        } catch (err) {
            // Force disconnect if quit fails
            redisClient.disconnect();
            logger.warn('Redis forced disconnect', { error: err.message });
        }
        redisClient = null;
    }
}

module.exports = {
    getRedisClient,
    isRedisAvailable,
    closeRedis
};
