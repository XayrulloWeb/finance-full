const prisma = require('../lib/prisma');
const pushService = require('../services/pushService');
const logger = require('../lib/logger');

// Get VAPID Public Key
exports.getPublicKey = (req, res) => {
    res.json({ publicKey: pushService.publicKey });
};

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Check if subscription already exists
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                user_id: userId,
                endpoint: subscription.endpoint
            }
        });

        if (existing) {
            return res.status(200).json({ success: true, message: 'Already subscribed' });
        }

        // Save subscription
        await prisma.pushSubscription.create({
            data: {
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                ua: req.headers['user-agent'] || 'unknown'
            }
        });

        res.status(201).json({ success: true });
    } catch (error) {
        logger.error('Push Subscribe Error', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
};

// Send test notification (for debugging)
exports.sendTest = async (req, res) => {
    try {
        const userId = req.user.id;
        await pushService.sendNotification(userId, {
            title: 'Test Notification',
            body: 'This is a test notification from Finance Empire!',
            icon: '/icon-192x192.png'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
