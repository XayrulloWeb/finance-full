const express = require('express');
const BalanceService = require('../services/balanceService');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * Test endpoint for race condition testing
 * POST /test/race-condition
 * Body: { accountId: string, amount: number }
 */
router.post('/race-condition', async (req, res) => {
    const { accountId, amount } = req.body;

    try {
        // Simulate concurrent transactions
        const promises = [];
        const numConcurrent = 10;

        console.log(`\n🧪 Testing ${numConcurrent} concurrent transactions...`);
        console.log(`Account: ${accountId}, Amount: ${amount} each\n`);

        for (let i = 0; i < numConcurrent; i++) {
            promises.push(
                prisma.$transaction(async (tx) => {
                    await BalanceService.updateBalanceChecked(
                        tx,
                        accountId,
                        amount,
                        'expense'
                    );
                })
            );
        }

        const start = Date.now();
        await Promise.all(promises);
        const duration = Date.now() - start;

        // Check final balance
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            select: { balance: true }
        });

        const expectedBalance = parseFloat(account.balance);

        res.json({
            success: true,
            message: 'Race condition test completed',
            results: {
                concurrent: numConcurrent,
                amountEach: amount,
                totalDeducted: amount * numConcurrent,
                finalBalance: expectedBalance,
                duration: `${duration}ms`,
                avgPerTx: `${(duration / numConcurrent).toFixed(2)}ms`
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

/**
 * Test endpoint for deadlock simulation
 * POST /test/deadlock
 */
router.post('/deadlock', async (req, res) => {
    const { account1Id, account2Id, amount } = req.body;

    try {
        console.log('\n🔒 Testing deadlock scenario...\n');

        // Two transactions trying to update two accounts in different order
        const tx1 = prisma.$transaction(async (tx) => {
            await BalanceService.updateBalanceChecked(tx, account1Id, amount, 'expense');
            await new Promise(resolve => setTimeout(resolve, 100)); // Delay
            await BalanceService.updateBalanceChecked(tx, account2Id, amount, 'income');
        });

        const tx2 = prisma.$transaction(async (tx) => {
            await BalanceService.updateBalanceChecked(tx, account2Id, amount, 'expense');
            await new Promise(resolve => setTimeout(resolve, 100)); // Delay
            await BalanceService.updateBalanceChecked(tx, account1Id, amount, 'income');
        });

        await Promise.all([tx1, tx2]);

        res.json({
            success: true,
            message: 'Deadlock test completed (no deadlock occurred)'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            isDeadlock: error.code === '40P01'
        });
    }
});

module.exports = router;
