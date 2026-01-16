const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createUserRateLimit, createAuthRateLimit } = require('../middleware/rateLimitMiddleware');

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

// Rate limiters
const userLimiter = createUserRateLimit();
const authLimiter = createAuthRateLimit();

// --- AUTH ---
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);

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
router.get('/notifications', authMiddleware, userLimiter, dataController.getNotifications);
router.post('/notifications/read-all', authMiddleware, userLimiter, dataController.markAllNotificationsRead);
router.post('/notifications/:id/read', authMiddleware, userLimiter, dataController.markNotificationRead);
router.get('/insights', authMiddleware, userLimiter, dataController.getInsights);
router.get('/analytics/summary', authMiddleware, userLimiter, dataController.getAnalyticsSummary);
router.get('/calendar/summary', authMiddleware, userLimiter, dataController.getCalendarSummary);
router.get('/data/bootstrap', authMiddleware, userLimiter, dataController.getBootstrapData);
router.post('/data/import', authMiddleware, userLimiter, dataController.importData);

// --- TRANSACTIONS ---
router.get('/transactions', authMiddleware, userLimiter, txController.getTransactions);
router.post('/transactions', authMiddleware, userLimiter, txController.createTransaction);
router.post('/transactions/transfer', authMiddleware, userLimiter, txController.performTransfer);
router.put('/transactions/:id', authMiddleware, userLimiter, txController.updateTransaction);
router.delete('/transactions/:id', authMiddleware, userLimiter, txController.deleteTransaction);

// --- ACCOUNTS ---
router.post('/accounts', authMiddleware, userLimiter, accountController.createAccount);
router.put('/accounts/:id', authMiddleware, userLimiter, accountController.updateAccount);
router.delete('/accounts/:id', authMiddleware, userLimiter, accountController.deleteAccount);

// --- CATEGORIES ---
router.post('/categories', authMiddleware, userLimiter, catController.createCategory);
router.delete('/categories/:id', authMiddleware, userLimiter, catController.deleteCategory);

// --- COUNTERPARTIES ---
router.get('/counterparties', authMiddleware, userLimiter, cpController.getCounterparties);
router.post('/counterparties', authMiddleware, userLimiter, cpController.createCounterparty);
router.put('/counterparties/:id', authMiddleware, userLimiter, cpController.updateCounterparty);
router.delete('/counterparties/:id', authMiddleware, userLimiter, cpController.deleteCounterparty);
router.post('/counterparties/:id/favorite', authMiddleware, userLimiter, cpController.toggleFavorite);

// --- GOALS ---
router.post('/goals', authMiddleware, userLimiter, financeController.createGoal);
router.delete('/goals/:id', authMiddleware, userLimiter, financeController.deleteGoal);
router.post('/goals/:id/topup', authMiddleware, userLimiter, financeController.topUpGoal);

// --- DEBTS ---
router.post('/debts', authMiddleware, userLimiter, financeController.createDebt);
router.delete('/debts/:id', authMiddleware, userLimiter, financeController.deleteDebt);
router.post('/debts/:id/pay', authMiddleware, userLimiter, financeController.payDebt);

// --- BUDGETS ---
router.post('/budgets', authMiddleware, userLimiter, financeController.upsertBudget);
router.delete('/budgets/:id', authMiddleware, userLimiter, financeController.deleteBudget);

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

module.exports = router;
