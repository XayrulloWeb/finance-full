const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Check budget limits for a given transaction
 * @param {string} userId
 * @param {string} categoryId
 * @param {number} amount
 * @param {Date} date
 * @returns {Promise<void>}
 */
async function checkBudgetLimits(userId, categoryId, amount, date = new Date()) {
    try {
        if (!categoryId) return;

        // 1. Find active budgets for this category
        const budgets = await prisma.budget.findMany({
            where: {
                user_id: userId,
                category_id: categoryId
            }
        });

        if (budgets.length === 0) return;

        const txDate = new Date(date);

        for (const budget of budgets) {
            let startDate, endDate;

            // Determine period range
            if (budget.period === 'month') {
                startDate = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
                endDate = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0, 23, 59, 59);
            } else if (budget.period === 'year') {
                startDate = new Date(txDate.getFullYear(), 0, 1);
                endDate = new Date(txDate.getFullYear(), 11, 31, 23, 59, 59);
            } else {
                continue; // Unknown period
            }

            // 2. Calculate total expenses for this period (including current transaction)
            const aggregations = await prisma.transaction.aggregate({
                where: {
                    user_id: userId,
                    category_id: categoryId,
                    type: { in: ['expense', 'transfer_out'] }, // Include transfers out if tracked? usually budgets track expenses.
                    // Let's stick to 'expense' for standard budgets, or maybe make it configurable. 
                    // Standard approach: Budgets track spending (expenses).
                    type: 'expense',
                    is_removed: false,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                _sum: { amount: true }
            });

            const currentTotal = Number(aggregations._sum.amount || 0); // This includes the transaction IF it was already saved. 
            // NOTE: This function is usually called AFTER saving the transaction, so it includes the current one.

            const limit = Number(budget.amount);
            const percentage = (currentTotal / limit) * 100;

            // 3. Check thresholds and create notifications
            let alertType = null;
            let messageKey = '';

            if (currentTotal > limit) {
                // Exceeded 100%
                alertType = 'budget_exceeded';
                messageKey = 'notifications.budget_exceeded';
            } else if (percentage >= 80) {
                // Exceeded 80% (Warning)
                alertType = 'budget_warning';
                messageKey = 'notifications.budget_warning';
            }

            if (alertType) {
                // Check if we already notified about this specific status RECENTLY (e.g. today? or just if it wasn't already triggered?)
                // Simple approach: Check if active notification exists for this month/budget to avoid spam.
                // Or allows spam for every transaction exceeding limit?
                // Better: Create notification. User can read/dismiss it.

                // Let's create a notification. filtering spam is complex logic, maybe just check if last notification for this budget was recent.

                // Get category name for message
                const category = await prisma.category.findUnique({
                    where: { id: categoryId },
                    select: { name: true }
                });

                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        type: alertType,
                        title: category?.name || 'Budget Alert',
                        message: `${percentage.toFixed(0)}% of limit used`, // Simplified message, can be localized on front
                        data: {
                            budget_id: budget.id,
                            category_id: categoryId,
                            limit: limit,
                            current: currentTotal,
                            percentage: percentage
                        },
                        is_read: false
                    }
                });

                logger.info(`Budget alert created: ${alertType} for user ${userId}, category ${categoryId}`);
            }
        }

    } catch (error) {
        logger.error('Error checking budget limits', { error: error.message, userId, categoryId });
    }
}

module.exports = {
    checkBudgetLimits
};
