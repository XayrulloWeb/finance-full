const cron = require('node-cron');
const prisma = require('../lib/prisma');
const BalanceService = require('../services/balanceService');

const processRecurringTransactions = async () => {
    console.log('🔄 Running Recurring Transactions Check...');
    try {
        const today = new Date();
        const currentDay = today.getDate();

        // 1. Находим все активные подписки, которые должны сработать сегодня
        // (Для упрощения проверяем просто по дню месяца. В идеале нужно хранить next_run_date)
        const recurringTx = await prisma.recurringTransaction.findMany({
            where: {
                active: true,
                day_of_month: currentDay
            }
        });

        console.log(`🔎 Found ${recurringTx.length} scheduled transactions for day ${currentDay}`);

        for (const subscription of recurringTx) {
            // Проверка: запускали ли мы уже эту подписку сегодня?
            // Если last_run сегодня, то пропускаем
            if (subscription.last_run) {
                const lastRunDate = new Date(subscription.last_run);
                if (
                    lastRunDate.getDate() === today.getDate() &&
                    lastRunDate.getMonth() === today.getMonth() &&
                    lastRunDate.getFullYear() === today.getFullYear()
                ) {
                    continue; // Уже выполнена сегодня
                }
            }

            // 2. Создаем транзакцию
            await prisma.$transaction(async (tx) => {
                const newTx = await tx.transaction.create({
                    data: {
                        user_id: subscription.user_id,
                        account_id: subscription.account_id,
                        category_id: subscription.category_id,
                        amount: subscription.amount, // Предполагаем, что валюта совпадает
                        type: subscription.type,
                        comment: subscription.comment || 'Recurring Payment',
                        date: new Date()
                    }
                });

                // 3. Обновляем баланс через BalanceService
                if (subscription.account_id) {
                    await BalanceService.updateBalance(tx, subscription.account_id, subscription.amount, subscription.type);
                }

                // 4. Обновляем last_run у подписки
                await tx.recurringTransaction.update({
                    where: { id: subscription.id },
                    data: { last_run: new Date() }
                });

                console.log(`✅ Processed recurring tx: ${subscription.id} -> Tx: ${newTx.id}`);
            });
        }

    } catch (error) {
        console.error('❌ Scheduler Error:', error);
    }
};

// Запуск каждый день в 00:01
const initScheduler = () => {
    cron.schedule('1 0 * * *', processRecurringTransactions);
    console.log('⏰ Scheduler initialized (Running daily at 00:01)');

    // DEV: Можно раскомментировать для теста при старте сервера
    // processRecurringTransactions();
};

module.exports = initScheduler;
