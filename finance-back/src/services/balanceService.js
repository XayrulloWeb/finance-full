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
     * Update account balance atomically
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
     * Update balance with sufficient funds check for negative increments
     * @param {object} tx - Prisma transaction object
     * @param {string} accountId - Account ID
     * @param {number} amount - Transaction amount
     * @param {string} type - Transaction type
     * @returns {Promise<void>}
     */
    static async updateBalanceChecked(tx, accountId, amount, type) {
        const increment = this.calculateIncrement(amount, type);
        if (increment >= 0) {
            await tx.account.update({
                where: { id: accountId },
                data: { balance: { increment } }
            });
            return;
        }

        const result = await tx.account.updateMany({
            where: { id: accountId, balance: { gte: amount } },
            data: { balance: { increment } }
        });

        if (result.count === 0) {
            const error = new Error('Insufficient balance');
            error.code = 'INSUFFICIENT_FUNDS';
            throw error;
        }
    }

    /**
     * Check if account has sufficient balance for expense/transfer
     * @param {object} tx - Prisma transaction object
     * @param {string} accountId - Account ID
     * @param {number} amount - Amount to check
     * @returns {Promise<boolean>} True if sufficient balance
     */
    static async hasSufficientBalance(tx, accountId, amount) {
        const account = await tx.account.findUnique({
            where: { id: accountId },
            select: { balance: true }
        });
        return account && account.balance >= amount;
    }
}

module.exports = BalanceService;
