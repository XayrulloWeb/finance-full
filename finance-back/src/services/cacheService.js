const { getRedisClient, isRedisAvailable } = require('../lib/redis');
const logger = require('../lib/logger');

class CacheService {
    constructor() {
        this.redis = null;
        this.prefix = 'finance:';
        this.enabled = process.env.REDIS_ENABLED !== 'false';
        this.available = false;
        this.initPromise = null;
    }

    /**
     * Initialize Redis connection
     */
    async init() {
        if (!this.enabled) {
            logger.info('Redis caching is disabled by configuration');
            return;
        }

        // Avoid multiple initializations
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.redis = getRedisClient();
                // Check availability
                this.available = await isRedisAvailable();

                if (this.available) {
                    logger.info('CacheService initialized successfully - Redis is ACTIVE');
                } else {
                    logger.warn('CacheService initialized but Redis unavailable - caching DISABLED');
                }
            } catch (error) {
                logger.error('CacheService initialization failed', { error: error.message });
                this.available = false;
            }
        })();

        return this.initPromise;
    }

    /**
     * Build cache key with prefix and user scope
     */
    buildKey(userId, resource, identifier = '') {
        return `${this.prefix}user:${userId}:${resource}${identifier ? ':' + identifier : ''}`;
    }

    /**
     * Get cached data
     */
    async get(key) {
        if (!this.enabled || !this.available || !this.redis) return null;

        try {
            const data = await this.redis.get(key);
            if (data) {
                logger.debug('Cache hit', { key });
                return JSON.parse(data);
            }
            // logger.debug('Cache miss', { key }); // Too verbose for development
            return null;
        } catch (error) {
            // Silent fail for cache get
            logger.warn('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set cache with TTL (in seconds)
     */
    async set(key, data, ttl = 60) {
        if (!this.enabled || !this.available || !this.redis) return;

        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
            // logger.debug('Cache set', { key, ttl });
        } catch (error) {
            logger.warn('Cache set error', { key, error: error.message });
        }
    }

    /**
     * Delete specific cache key
     */
    async del(key) {
        if (!this.enabled || !this.available || !this.redis) return;

        try {
            await this.redis.del(key);
            logger.debug('Cache deleted', { key });
        } catch (error) {
            logger.warn('Cache delete error', { key, error: error.message });
        }
    }

    /**
     * Delete all cache keys for a user (Pattern match)
     * Warning: performance impact on large datasets, use carefully
     */
    async invalidateUser(userId) {
        if (!this.enabled || !this.available || !this.redis) return;

        try {
            const pattern = `${this.prefix}user:${userId}:*`;
            // Get keys first
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                logger.info('User cache invalidated', { userId, keysCount: keys.length });
            }
        } catch (error) {
            logger.error('Cache invalidation error', { userId, error: error.message });
        }
    }

    /**
     * Invalidate specific resource for user
     */
    async invalidateResource(userId, resource) {
        if (!this.enabled || !this.available || !this.redis) return;

        try {
            const pattern = `${this.prefix}user:${userId}:${resource}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                logger.debug('Resource cache invalidated', { userId, resource, keysCount: keys.length });
            }
        } catch (error) {
            logger.error('Resource invalidation error', { userId, resource, error: error.message });
        }
    }

    // =========================================
    // Resource-specific cache methods
    // =========================================

    /**
     * Cache dashboard data (TTL: 60s)
     */
    async getDashboard(userId) {
        const key = this.buildKey(userId, 'dashboard');
        return this.get(key);
    }

    async setDashboard(userId, data) {
        const key = this.buildKey(userId, 'dashboard');
        return this.set(key, data, 60);
    }

    async invalidateDashboard(userId) {
        await this.invalidateResource(userId, 'dashboard');
    }

    /**
     * Cache analytics summary (TTL: 5 min)
     */
    async getAnalytics(userId) {
        const key = this.buildKey(userId, 'analytics');
        return this.get(key);
    }

    async setAnalytics(userId, data) {
        const key = this.buildKey(userId, 'analytics');
        return this.set(key, data, 300);
    }

    async invalidateAnalytics(userId) {
        await this.invalidateResource(userId, 'analytics');
    }

    /**
     * Cache categories (TTL: 10 min)
     */
    async getCategories(userId) {
        const key = this.buildKey(userId, 'categories');
        return this.get(key);
    }

    async setCategories(userId, data) {
        const key = this.buildKey(userId, 'categories');
        return this.set(key, data, 600);
    }

    async invalidateCategories(userId) {
        await this.invalidateResource(userId, 'categories');
    }

    /**
     * Cache bootstrap data (TTL: 2 min)
     */
    async getBootstrap(userId) {
        const key = this.buildKey(userId, 'bootstrap');
        return this.get(key);
    }

    async setBootstrap(userId, data) {
        const key = this.buildKey(userId, 'bootstrap');
        return this.set(key, data, 120);
    }

    async invalidateBootstrap(userId) {
        await this.invalidateResource(userId, 'bootstrap');
    }

    /**
     * Universal invalidator after data modification
     * Clears dashboard, analytics and bootstrap to ensure freshness
     */
    async invalidateAfterDataChange(userId) {
        await Promise.all([
            this.invalidateDashboard(userId),
            this.invalidateAnalytics(userId),
            this.invalidateBootstrap(userId)
        ]);
        logger.debug('Data caches invalidated', { userId });
    }
}

// Create and export singleton
const cacheService = new CacheService();
// Start init immediately but don't wait for it
cacheService.init().catch(err => {
    logger.error('Failed to initialize cache service', { error: err.message });
});

module.exports = cacheService;
