const webpush = require('web-push');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// Initialize web-push
if (process.env.WEB_PUSH_VAPID_PUBLIC_KEY && process.env.WEB_PUSH_VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.WEB_PUSH_CONTACT || 'mailto:admin@example.com',
        process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
        process.env.WEB_PUSH_VAPID_PRIVATE_KEY
    );
} else {
    logger.warn('Web Push VAPID keys not found. Push notifications disabled.');
}

/**
 * Send push notification to a user
 * @param {string} userId - User UUID
 * @param {object} payload - Notification payload { title, body, url, icon }
 */
const sendNotification = async (userId, payload) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { user_id: userId }
        });

        if (!subscriptions.length) return { success: false, sent: 0 };

        const notificationPayload = JSON.stringify(payload);
        const promises = subscriptions.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                notificationPayload
            ).catch(error => {
                // If 410 (Gone) or 404, remove subscription
                if (error.statusCode === 410 || error.statusCode === 404) {
                    return prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                logger.error('Error sending push', { error: error.message, subId: sub.id });
                return null;
            })
        );

        await Promise.all(promises);
        return { success: true, sent: subscriptions.length };
    } catch (error) {
        logger.error('Error in sendNotification', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendNotification,
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY
};
