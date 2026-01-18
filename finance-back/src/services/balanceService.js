const logger = require('../lib/logger');

class BalanceService {
    /**
     * Calculate increment for balance based on transaction type
     * @param {number} amount - Transaction amount
     * @param {string} type - Transaction type (income, expense, transfer_in, transfer_out)
     * @returns {number} Amount to increment/decrement balance
     */
    static calculateIncrement(amount, type) {
        const typeMap = {
            income: 1,
            expense: -1,
            transfer_in: 1,
            transfer_out: -1
        };
        return amount * (typeMap[type] || 0);
    }

    /**
     * Update account balance atomically (for positive increments only)
     * @param {object} tx - Prisma transaction object
     * @param {string} accountId - Account ID
     * @param {number} amount - Transaction amount
     * @param {string} type - Transaction type
     * @returns {Promise} Updated account
     */
    static async updateBalance(tx, accountId, amount, type) {
        const increment = this.calculateIncrement(amount, type);
        return tx.account.update({
            where: { id: accountId },
            data: { balance: { increment } }
        });
    }

    /**
     * Update balance with SELECT FOR UPDATE to prevent race conditions
     * @param {object} tx - Prisma transaction object
     * @param {string} accountId - Account ID
     * @param {number} amount - Transaction amount
     * @param {string} type - Transaction type
     * @returns {Promise<void>}
     */
    static async updateBalanceChecked(tx, accountId, amount, type) {
        const increment = this.calculateIncrement(amount, type);

        try {
            // SELECT FOR UPDATE блокирует строку до конца транзакции
            // Это предотвращает race conditions при одновременных запросах
            const result = await tx.$queryRaw`
                SELECT balance FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE
            `;

            if (!result || result.length === 0) {
                const error = new Error('Account not found');
                error.code = 'NOT_FOUND';
                throw error;
            }

            const currentBalance = parseFloat(result[0].balance);
            const newBalance = currentBalance + increment;

            // Проверка отрицательного баланса для расходов и переводов
            if (newBalance < 0 && (type === 'expense' || type === 'transfer_out')) {
                logger.warn('Insufficient balance attempt', {
                    accountId,
                    currentBalance,
                    requestedAmount: amount,
                    type,
                    newBalance
                });

                const error = new Error('Insufficient balance');
                error.code = 'INSUFFICIENT_FUNDS';
                throw error;
            }

            // Атомарное обновление баланса
            await tx.$executeRaw`
                UPDATE accounts 
                SET balance = ${newBalance}, updated_at = NOW()
                WHERE id = ${accountId}::uuid
            `;

            logger.debug('Balance updated', {
                accountId,
                oldBalance: currentBalance,
                increment,
                newBalance,
                type
            });

        } catch (error) {
            // Если это deadlock, Prisma автоматически retry
            // Логируем для мониторинга
            if (error.code === '40P01') { // Deadlock detected
                logger.warn('Deadlock detected in balance update', {
                    accountId,
                    amount,
                    type,
                    error: error.message
                });
            }
            throw error;
        }
    }

    /**
     * Check if account has sufficient balance for expense/transfer (with lock)
     * @param {object} tx - Prisma transaction object
     * @param {string} accountId - Account ID
     * @param {number} amount - Amount to check
     * @returns {Promise<boolean>} True if sufficient balance
     */
    static async hasSufficientBalance(tx, accountId, amount) {
        // Также используем SELECT FOR UPDATE для консистентности
        const result = await tx.$queryRaw`
            SELECT balance FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE
        `;

        if (!result || result.length === 0) {
            return false;
        }

        const currentBalance = parseFloat(result[0].balance);
        return currentBalance >= amount;
    }

    /**
     * Batch update multiple accounts (for transfers or bulk operations)
     * @param {object} tx - Prisma transaction object
     * @param {Array} updates - Array of {accountId, amount, type}
     * @returns {Promise<void>}
     */
    static async batchUpdateBalances(tx, updates) {
        for (const update of updates) {
            await this.updateBalanceChecked(
                tx,
                update.accountId,
                update.amount,
                update.type
            );
        }
    }
}

module.exports = BalanceService;
