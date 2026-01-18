require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const logger = require('./lib/logger');

if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is required');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Sentry initialization (if DSN provided)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
    });
    const requestHandler = Sentry.Handlers?.requestHandler?.();
    const tracingHandler = Sentry.Handlers?.tracingHandler?.();
    if (requestHandler) {
        app.use(requestHandler);
    }
    if (tracingHandler) {
        app.use(tracingHandler);
    }
    if (!requestHandler && !tracingHandler) {
        logger.warn('Sentry Handlers not available; skipping Sentry middleware');
    } else {
        logger.info('Sentry monitoring enabled');
    }
}


// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Increased to 1000 to prevent blocking during dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMIT_EXCEEDED', error: 'Too many requests, please try again later.' },
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        res.status(429).json({
            code: 'RATE_LIMIT_EXCEEDED',
            error: 'Too many requests, please try again later.'
        });
    }
});
app.use(limiter);

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));

// Logging Middleware
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

const routes = require('./routes');
const initScheduler = require('./cron/scheduler');

// Routes
app.use('/api', routes);

// Health Check
app.get('/', (req, res) => {
    res.send('Finance Empire Backend is Running 🚀');
});

// Sentry Error Handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
    const errorHandler = Sentry.Handlers?.errorHandler?.();
    if (errorHandler) {
        app.use(errorHandler);
    } else {
        logger.warn('Sentry error handler not available; skipping error middleware');
    }
}

// Global Error Handling
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip
    });

    // Don't leak error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(err.status || 500).json({
        code: err.code || 'INTERNAL_ERROR',
        error: isDev ? err.message : 'Something went wrong',
        ...(isDev && { stack: err.stack })
    });
});

// Start Server
app.listen(PORT, () => {
    logger.info('🟢 FINANCE EMPIRE SERVER STARTED', {
        port: PORT,
        cors: process.env.CLIENT_URL || 'http://localhost:5173',
        environment: process.env.NODE_ENV || 'development',
        sentry: !!process.env.SENTRY_DSN
    });
    console.log(`\n🟢 FINANCE EMPIRE SERVER STARTED`);
    console.log(`🛡️  CORS Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`📅 Time: ${new Date().toLocaleString()}\n`);
    initScheduler();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');

    // Close Redis connection
    const { closeRedis } = require('./lib/redis');
    await closeRedis();

    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');

    // Close Redis connection
    const { closeRedis } = require('./lib/redis');
    await closeRedis();

    process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
