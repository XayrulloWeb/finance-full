const BalanceService = require('../services/balanceService');

describe('BalanceService', () => {
    let mockTx;

    beforeEach(() => {
        mockTx = {
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
            account: {
                update: jest.fn()
            }
        };
    });

    describe('calculateIncrement', () => {
        test('should return positive for income', () => {
            expect(BalanceService.calculateIncrement(100, 'income')).toBe(100);
        });
        test('should return negative for expense', () => {
            expect(BalanceService.calculateIncrement(50, 'expense')).toBe(-50);
        });
        test('should return positive for transfer_in', () => {
            expect(BalanceService.calculateIncrement(200, 'transfer_in')).toBe(200);
        });
        test('should return negative for transfer_out', () => {
            expect(BalanceService.calculateIncrement(150, 'transfer_out')).toBe(-150);
        });
    });

    describe('updateBalanceChecked', () => {
        test('should use SELECT FOR UPDATE and update balance correctly for income', async () => {
            const accountId = 'acc-123';
            const amount = 100;
            const type = 'income';

            // Mock finding account with balance 500
            mockTx.$queryRaw.mockResolvedValue([{ balance: 500 }]);

            await BalanceService.updateBalanceChecked(mockTx, accountId, amount, type);

            // Verify Lock was requested
            expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

            // Verify Update was executed with new balance 600
            expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
        });

        test('should throw INSUFFICIENT_FUNDS if expense exceeds balance', async () => {
            const accountId = 'acc-123';
            const amount = 1000;
            const type = 'expense';

            // Mock finding account with balance 500
            mockTx.$queryRaw.mockResolvedValue([{ balance: 500 }]);

            await expect(BalanceService.updateBalanceChecked(mockTx, accountId, amount, type))
                .rejects
                .toMatchObject({ code: 'INSUFFICIENT_FUNDS' });

            // Should NOT execute update
            expect(mockTx.$executeRaw).not.toHaveBeenCalled();
        });

        test('should throw NOT_FOUND if account does not exist', async () => {
            const accountId = 'acc-unknown';
            mockTx.$queryRaw.mockResolvedValue([]);

            await expect(BalanceService.updateBalanceChecked(mockTx, accountId, 100, 'income'))
                .rejects
                .toMatchObject({ code: 'NOT_FOUND' });
        });
    });
});
