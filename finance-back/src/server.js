require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is required');
    process.exit(1);
}
// Security Middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs (for unauthenticated)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
const routes = require('./routes');
const initScheduler = require('./cron/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(limiter);
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Restrict origin
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Для JSON боди (и для импорта больших файлов)
app.use(morgan('dev')); // Логирование запросов в консоль

// Routes
app.use('/api', routes);

// Health Check
app.get('/', (req, res) => {
    res.send('Finance Empire Backend is Running 🚀');
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something broke!'
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n🟢 FINANCE EMPIRE SERVER STARTED`);
    console.log(`🛡️  CORS Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`📅 Time: ${new Date().toLocaleString()}\n`);
    initScheduler();
});
