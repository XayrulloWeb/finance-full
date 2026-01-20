const prisma = require('../lib/prisma');
const pushService = require('./pushService');
const logger = require('../lib/logger');

const checkReminders = async () => {
    logger.info('🔔 Checking reminders...');
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // 1. Check Debts Due Soon (Tomorrow or Today)
        const debtsDue = await prisma.debt.findMany({
            where: {
                due_date: {
                    gte: todayStart,
                    lte: tomorrow
                },
                is_closed: false,
                is_removed: false
            },
            include: { user: true }
        });

        for (const debt of debtsDue) {
            await pushService.sendNotification(debt.user_id, {
                title: 'Debt Reminder',
                body: `Debt "${debt.name}" is due ${debt.due_date <= now ? 'today' : 'soon'}! Amount: ${debt.amount}`,
                icon: '/icons/icon-192x192.png',
                url: '/debts'
            });
        }

        // 2. Check Goals Deadlines
        const goalsDue = await prisma.goal.findMany({
            where: {
                deadline: {
                    gte: todayStart,
                    lte: tomorrow
                },
                is_completed: false,
                is_removed: false
            }
        });

        for (const goal of goalsDue) {
            await pushService.sendNotification(goal.user_id, {
                title: 'Goal Deadline',
                body: `Goal "${goal.name}" deadline is approaching!`,
                icon: '/icons/icon-192x192.png',
                url: '/goals'
            });
        }

        logger.info(`Checked reminders. Sent for ${debtsDue.length} debts and ${goalsDue.length} goals.`);
    } catch (error) {
        logger.error('Error checking reminders', error);
    }
};

module.exports = {
    checkReminders
};
