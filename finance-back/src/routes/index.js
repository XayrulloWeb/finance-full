const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createUserRateLimit, createAuthRateLimit, loginRateLimit } = require('../middleware/rateLimitMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
    registerSchema,
    loginSchema,
    verifySchema,
    transactionSchema,
    transferSchema,
    accountSchema,
    updateAccountSchema,
    categorySchema,
    counterpartySchema,
    updateCounterpartySchema,
    goalSchema,
    debtSchema,
    budgetSchema,
    debtRequestSchema,
    rejectDebtSchema,
    payLinkedDebtSchema
} = require('../lib/validation');

const authController = require('../controllers/authController');
const dataController = require('../controllers/dataController');
const txController = require('../controllers/transactionController');
const accountController = require('../controllers/accountController');
const catController = require('../controllers/categoryController');
const cpController = require('../controllers/counterpartyController');
const recurringController = require('../controllers/recurringController');
const financeController = require('../controllers/financeController');
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const aiController = require('../controllers/aiController');
const debtRequestController = require('../controllers/debtRequestController');

// Rate limiters
const userLimiter = createUserRateLimit();
const authLimiter = createAuthRateLimit();

// --- AUTH ---
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/auth/verify', authLimiter, validate(verifySchema), authController.verifyEmail);
router.post('/auth/request-password-reset', authLimiter, authController.requestPasswordReset);
router.post('/auth/confirm-password-reset', authLimiter, authController.confirmPasswordReset);
router.post('/auth/resend-verification', authLimiter, authController.resendVerificationCode);

// --- DATA READ ---
router.get('/dashboard', authMiddleware, userLimiter, dataController.getDashboard);
router.get('/categories', authMiddleware, userLimiter, dataController.getCategories);
router.get('/budgets', authMiddleware, userLimiter, dataController.getBudgets);
router.get('/debts', authMiddleware, userLimiter, dataController.getDebts);
router.get('/goals', authMiddleware, userLimiter, dataController.getGoals);
router.get('/recurring', authMiddleware, userLimiter, recurringController.getRecurring);
router.post('/recurring', authMiddleware, userLimiter, recurringController.createRecurring);
router.put('/recurring/:id', authMiddleware, userLimiter, recurringController.updateRecurring);
router.delete('/recurring/:id', authMiddleware, userLimiter, recurringController.deleteRecurring);
router.get('/settings', authMiddleware, userLimiter, dataController.getSettings);
router.put('/settings', authMiddleware, userLimiter, dataController.updateSettings);
router.post('/settings/refresh-rates', authMiddleware, userLimiter, dataController.refreshCurrencyRates);
router.get('/notifications', authMiddleware, userLimiter, dataController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, userLimiter, dataController.getUnreadNotificationsCount);
router.post('/notifications/read-all', authMiddleware, userLimiter, dataController.markAllNotificationsRead);
router.post('/notifications/:id/read', authMiddleware, userLimiter, dataController.markNotificationRead);
router.get('/insights', authMiddleware, userLimiter, dataController.getInsights);
router.get('/insights/smart', authMiddleware, userLimiter, dataController.getAiInsight);
router.get('/analytics/summary', authMiddleware, userLimiter, dataController.getAnalyticsSummary);
router.get('/calendar/summary', authMiddleware, userLimiter, dataController.getCalendarSummary);
router.get('/data/bootstrap', authMiddleware, userLimiter, dataController.getBootstrapData);
router.post('/data/import', authMiddleware, userLimiter, dataController.importData);

// --- AI ---
router.post('/ai/transaction-suggest', authMiddleware, userLimiter, aiController.suggestTransactionMeta);
router.get('/ai/alerts', authMiddleware, userLimiter, aiController.getSmartAlerts);
router.get('/ai/forecast', authMiddleware, userLimiter, aiController.getForecast);
router.get('/ai/analytics-explain', authMiddleware, userLimiter, aiController.getAnalyticsExplanation);
router.get('/ai/goals-advice', authMiddleware, userLimiter, aiController.getGoalsAdvice);
router.get('/ai/debts-advice', authMiddleware, userLimiter, aiController.getDebtsAdvice);
router.get('/ai/categories/suggest', authMiddleware, userLimiter, aiController.getCategorySuggestions);

// --- TRANSACTIONS ---
router.get('/transactions', authMiddleware, userLimiter, txController.getTransactions);
router.post('/transactions', authMiddleware, userLimiter, validate(transactionSchema), txController.createTransaction);
router.post('/transactions/transfer', authMiddleware, userLimiter, validate(transferSchema), txController.performTransfer);
router.put('/transactions/:id', authMiddleware, userLimiter, txController.updateTransaction);
router.delete('/transactions/:id', authMiddleware, userLimiter, txController.deleteTransaction);

// --- ACCOUNTS ---
router.post('/accounts', authMiddleware, userLimiter, validate(accountSchema), accountController.createAccount);
router.put('/accounts/:id', authMiddleware, userLimiter, validate(updateAccountSchema), accountController.updateAccount);
router.delete('/accounts/:id', authMiddleware, userLimiter, accountController.deleteAccount);

// --- CATEGORIES ---
router.post('/categories', authMiddleware, userLimiter, validate(categorySchema), catController.createCategory);
router.delete('/categories/:id', authMiddleware, userLimiter, catController.deleteCategory);

// --- COUNTERPARTIES ---
router.get('/counterparties', authMiddleware, userLimiter, cpController.getCounterparties);
router.post('/counterparties', authMiddleware, userLimiter, validate(counterpartySchema), cpController.createCounterparty);
router.put('/counterparties/:id', authMiddleware, userLimiter, validate(updateCounterpartySchema), cpController.updateCounterparty);
router.delete('/counterparties/:id', authMiddleware, userLimiter, cpController.deleteCounterparty);
router.post('/counterparties/:id/favorite', authMiddleware, userLimiter, cpController.toggleFavorite);

// --- GOALS ---
router.post('/goals', authMiddleware, userLimiter, validate(goalSchema), financeController.createGoal);
router.delete('/goals/:id', authMiddleware, userLimiter, financeController.deleteGoal);
router.post('/goals/:id/topup', authMiddleware, userLimiter, financeController.topUpGoal);

// --- DEBTS ---
router.post('/debts', authMiddleware, userLimiter, validate(debtSchema), financeController.createDebt);
router.delete('/debts/:id', authMiddleware, userLimiter, financeController.deleteDebt);
router.post('/debts/:id/pay', authMiddleware, userLimiter, financeController.payDebt);

// --- BUDGETS ---
router.post('/budgets', authMiddleware, userLimiter, validate(budgetSchema), financeController.upsertBudget);
router.delete('/budgets/:id', authMiddleware, userLimiter, financeController.deleteBudget);

// --- DEBT REQUESTS (Social Debts) ---
router.get('/debt-requests/incoming', authMiddleware, userLimiter, debtRequestController.getIncomingRequests);
router.get('/debt-requests/outgoing', authMiddleware, userLimiter, debtRequestController.getOutgoingRequests);
router.get('/debt-requests/stats', authMiddleware, userLimiter, debtRequestController.getRequestStats);
router.post('/debt-requests', authMiddleware, userLimiter, validate(debtRequestSchema), debtRequestController.createDebtRequest);
router.post('/debt-requests/:id/accept', authMiddleware, userLimiter, debtRequestController.acceptDebtRequest);
router.post('/debt-requests/:id/reject', authMiddleware, userLimiter, validate(rejectDebtSchema), debtRequestController.rejectDebtRequest);
router.delete('/debt-requests/:id', authMiddleware, userLimiter, debtRequestController.cancelDebtRequest);

// --- LINKED DEBTS ---
router.get('/linked-debts/:id/activity', authMiddleware, userLimiter, debtRequestController.getLinkedDebtActivity);

// --- ADMIN ---
router.get('/admin/summary', authMiddleware, adminMiddleware, userLimiter, adminController.getAdminSummary);
router.get('/admin/users', authMiddleware, adminMiddleware, userLimiter, adminController.getAdminUsers);
router.post('/admin/users/:id/ban', authMiddleware, adminMiddleware, userLimiter, adminController.banUser);
router.post('/admin/users/:id/unban', authMiddleware, adminMiddleware, userLimiter, adminController.unbanUser);
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, userLimiter, adminController.deleteUser);
router.post('/admin/users/:id/reset-password', authMiddleware, adminMiddleware, userLimiter, adminController.resetUserPassword);
router.get('/admin/content', authMiddleware, adminMiddleware, userLimiter, adminController.getAdminContent);
router.post('/admin/content/:type/:id/action', authMiddleware, adminMiddleware, userLimiter, adminController.moderateContent);
router.get('/admin/export', authMiddleware, adminMiddleware, userLimiter, adminController.exportUsers);

// --- PUSH NOTIFICATIONS ---
const pushController = require('../controllers/pushController');
router.get('/push/key', authMiddleware, userLimiter, pushController.getPublicKey);
router.post('/push/subscribe', authMiddleware, userLimiter, pushController.subscribe);
router.post('/push/test', authMiddleware, userLimiter, pushController.sendTest);

// --- HEALTH CHECK ---
const healthController = require('../controllers/healthController');
router.get('/health', healthController.checkHealth);

// --- TEST ROUTES (Development Only) ---
if (process.env.NODE_ENV !== 'production') {
    const testRoutes = require('./test');
    router.use('/test', testRoutes);
}

module.exports = router;
