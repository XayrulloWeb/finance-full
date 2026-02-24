const prisma = require('../lib/prisma');
const AiService = require('../services/aiService');
const cacheService = require('../services/cacheService');
const logger = require('../lib/logger');

// Дашборд: Аккаунты (с балансами) + Последние транзакции
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await prisma.account.findMany({ where: { user_id: userId, is_hidden: false }, orderBy: { name: 'asc' } });
        const recentTransactions = await prisma.transaction.findMany({ where: { user_id: userId, is_removed: false }, orderBy: { date: 'desc' }, take: 5 });
        res.json({ accounts, recentTransactions });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
};

// Bootstrap: Загрузка ВСЕХ данных одним запросом
exports.getBootstrapData = async (req, res) => {
    try {
        const userId = req.user.id;
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const [accounts, categories, budgets, debts, goals, recurring, settings, notifications, counterparties, recentTransactions] = await Promise.all([
            prisma.account.findMany({ where: { user_id: userId, is_hidden: false }, orderBy: { name: 'asc' } }),
            prisma.category.findMany({ where: { user_id: userId }, orderBy: { name: 'asc' } }),
            prisma.budget.findMany({ where: { user_id: userId } }),
            prisma.debt.findMany({
                where: { user_id: userId, is_removed: false },
                orderBy: { created_at: 'desc' },
                include: {
                    linked_debt_a: { include: { user_b: { select: { email: true, id: true } } } },
                    linked_debt_b: { include: { user_a: { select: { email: true, id: true } } } }
                }
            }),
            prisma.goal.findMany({ where: { user_id: userId, is_removed: false }, orderBy: [{ is_completed: 'asc' }, { created_at: 'asc' }] }),
            prisma.recurringTransaction.findMany({ where: { user_id: userId }, orderBy: { day_of_month: 'asc' } }),
            prisma.userSettings.findUnique({ where: { user_id: userId } }),
            prisma.notification.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 20 }),
            prisma.counterparty.findMany({ where: { user_id: userId }, orderBy: { name: 'asc' } }),
            prisma.transaction.findMany({ where: { user_id: userId, is_removed: false }, orderBy: { date: 'desc' }, take: 5 })
        ]);

        // Calculate Counterparty Stats for Bootstrap
        const cpStats = await prisma.transaction.groupBy({
            by: ['counterparty_id', 'type'],
            where: {
                user_id: userId,
                is_removed: false,
                counterparty_id: { not: null }
            },
            _sum: { amount: true },
            _count: { id: true }
        });

        const counterpartiesWithStats = counterparties.map(cp => {
            const stats = cpStats.filter(s => s.counterparty_id === cp.id);
            const totalIncome = stats.filter(s => s.type === 'income' || s.type === 'transfer_in').reduce((sum, s) => sum + Number(s._sum.amount), 0);
            const totalExpense = stats.filter(s => s.type === 'expense' || s.type === 'transfer_out').reduce((sum, s) => sum + Number(s._sum.amount), 0);
            const transactionCount = stats.reduce((sum, s) => sum + s._count.id, 0);

            return {
                ...cp,
                stats: { totalIncome, totalExpense, transactionCount }
            };
        });

        // Calculate Top Expenses for Bootstrap
        const topExpensesRaw = await prisma.transaction.groupBy({
            by: ['category_id'],
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: { gte: monthStart },
                category_id: { not: null }
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 3
        });

        const topExpenses = await Promise.all(topExpensesRaw.map(async (item) => {
            if (!item.category_id) return { name: 'Без категории', icon: '❓', amount: Number(item._sum.amount), percentage: 0 };
            const category = categories.find(c => c.id === item.category_id);
            return {
                categoryId: item.category_id,
                name: category?.name || 'Unknown',
                icon: category?.icon || '❓',
                amount: Number(item._sum.amount),
                percentage: 0 // Will be calculated on frontend or here if needed, but let's calculate here for consistency
            };
        }));

        // Calculate total expenses for percentage
        const totalExpenses = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: { gte: monthStart },
                category_id: { not: null }
            },
            _sum: { amount: true }
        });
        const totalExpVal = Number(totalExpenses._sum.amount) || 0;

        topExpenses.forEach(te => {
            te.percentage = totalExpVal > 0 ? Math.round((te.amount / totalExpVal) * 100) : 0;
        });


        res.json({
            accounts,
            categories,
            budgets,
            debts,
            goals,
            recurring,
            settings,
            notifications,
            counterparties: counterpartiesWithStats,
            recentTransactions,
            topExpenses
        });
    } catch (error) {
        console.error('Bootstrap Error:', error);
        res.status(500).json({ error: 'Failed to fetch bootstrap data' });
    }
};

// Generic Getters (Простые списки)
exports.getCategories = async (req, res) => {
    try {
        const data = await prisma.category.findMany({ where: { user_id: req.user.id }, orderBy: { name: 'asc' } });
        res.json(data);
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getBudgets = async (req, res) => {
    try {
        const data = await prisma.budget.findMany({ where: { user_id: req.user.id } });
        res.json(data);
    } catch (error) {
        console.error('Get Budgets Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDebts = async (req, res) => {
    try {
        const data = await prisma.debt.findMany({
            where: { user_id: req.user.id, is_removed: false },
            orderBy: { created_at: 'desc' },
            include: {
                linked_debt_a: { include: { user_b: { select: { email: true, id: true } } } },
                linked_debt_b: { include: { user_a: { select: { email: true, id: true } } } }
            }
        });
        res.json(data);
    } catch (error) {
        console.error('Get Debts Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getGoals = async (req, res) => {
    try {
        const data = await prisma.goal.findMany({ where: { user_id: req.user.id, is_removed: false }, orderBy: [{ is_completed: 'asc' }, { created_at: 'asc' }] });
        res.json(data);
    } catch (error) {
        console.error('Get Goals Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRecurring = async (req, res) => {
    try {
        const data = await prisma.recurringTransaction.findMany({ where: { user_id: req.user.id }, orderBy: { day_of_month: 'asc' } });
        res.json(data);
    } catch (error) {
        console.error('Get Recurring Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const [settings, user] = await Promise.all([
            prisma.userSettings.findUnique({ where: { user_id: userId } }),
            prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true, status: true } })
        ]);

        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        res.json({
            ...settings,
            user_email: user?.email || null,
            user_role: user?.role || 'user',
            user_status: user?.status || 'active'
        });
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const { page = 0, limit = 20 } = req.query;
        const userId = req.user.id;

        const [data, total] = await Promise.all([
            prisma.notification.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                skip: Number(page) * Number(limit),
                take: Number(limit)
            }),
            prisma.notification.count({ where: { user_id: userId } })
        ]);

        res.json({
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        logger.error('Get Notifications Error', { error: error.message, userId: req.user.id });
        res.status(500).json({ error: error.message });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const result = await prisma.notification.updateMany({
            where: { id: req.params.id, user_id: req.user.id },
            data: { is_read: true }
        });
        if (result.count === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { user_id: req.user.id, is_read: false },
            data: { is_read: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUnreadNotificationsCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: { user_id: req.user.id, is_read: false }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = await prisma.userSettings.update({
            where: { user_id: req.user.id },
            data: req.body
        });
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true, role: true, status: true }
        });
        res.json({
            ...settings,
            user_email: user?.email || null,
            user_role: user?.role || 'user',
            user_status: user?.status || 'active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- INSIGHTS ---
exports.getInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. Расходы за этот месяц
        const thisMonthExpenses = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: { gte: currentMonthStart }
            },
            _sum: { amount: true }
        });

        // 2. Расходы за прошлый месяц
        const lastMonthExpenses = await prisma.transaction.aggregate({
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd
                }
            },
            _sum: { amount: true }
        });

        // 3. Топ категорий
        const topCategoriesRaw = await prisma.transaction.groupBy({
            by: ['category_id'],
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: { gte: currentMonthStart },
                category_id: { not: null }
            },
            _sum: { amount: true },
            orderBy: {
                _sum: { amount: 'desc' }
            },
            take: 5
        });

        // Обогащаем данными о категориях
        const topCategories = await Promise.all(topCategoriesRaw.map(async (item) => {
            if (!item.category_id) return { name: 'Без категории', icon: '❓', current: Number(item._sum.amount) };
            const category = await prisma.category.findUnique({
                where: { id: item.category_id },
                select: { name: true, icon: true }
            });
            return {
                name: category?.name || 'Unknown',
                icon: category?.icon || '❓',
                current: Number(item._sum.amount)
            };
        }));

        res.json({
            thisMonthExpenses: Number(thisMonthExpenses._sum.amount) || 0,
            lastMonthExpenses: Number(lastMonthExpenses._sum.amount) || 0,
            topCategories
        });
    } catch (error) {
        console.error('Insights Error:', error);
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
};

exports.getAiInsight = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'AI service unavailable' });
        }
        const headerLang = req.headers['x-app-lang'] || req.headers['accept-language'];
        const requestedLang = req.query.lang || headerLang || '';
        const normalizedLang = String(requestedLang).split(',')[0].trim().toLowerCase();
        const lang = normalizedLang.startsWith('uz') ? 'uz' : normalizedLang.startsWith('en') ? 'en' : 'ru';
        const insight = await AiService.getDailyInsight(req.user.id, lang);
        res.json(insight);
    } catch (error) {
        console.error('AI Insight Error:', error);
        res.status(500).json({ error: 'Failed to fetch AI insight' });
    }
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        // Cache enabled only for default view (30 days) to avoid complexity with query params
        const isDefaultView = !req.query.days || req.query.days == 30;

        if (isDefaultView) {
            // Временно отключаем кэш для аналитики, чтобы данные обновлялись мгновенно
            // const cached = await cacheService.getAnalytics(userId);
            // if (cached) return res.json(cached);
        }

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [incomeAgg, expenseAgg, expenseGroups] = await Promise.all([
            prisma.transaction.aggregate({
                where: { user_id: userId, type: 'income', is_removed: false, date: { gte: currentMonthStart, lte: currentMonthEnd } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: currentMonthStart, lte: currentMonthEnd } },
                _sum: { amount: true }
            }),
            prisma.transaction.groupBy({
                by: ['category_id'],
                where: {
                    user_id: userId,
                    type: 'expense',
                    is_removed: false,
                    date: { gte: currentMonthStart, lte: currentMonthEnd },
                    category_id: { not: null }
                },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } }
            })
        ]);

        const income = Number(incomeAgg._sum.amount) || 0;
        const expense = Number(expenseAgg._sum.amount) || 0;

        const categoryIds = expenseGroups.map(group => group.category_id).filter(Boolean);
        const categories = categoryIds.length > 0
            ? await prisma.category.findMany({
                where: { id: { in: categoryIds } },
                select: { id: true, name: true, icon: true, color: true }
            })
            : [];

        const categoriesById = new Map(categories.map(cat => [cat.id, cat]));
        const expenseByCategory = expenseGroups.map(group => {
            const category = categoriesById.get(group.category_id);
            return {
                category_id: group.category_id,
                name: category?.name || 'Unknown',
                icon: category?.icon || '¢?"',
                color: category?.color || '#64748b',
                amount: Number(group._sum.amount) || 0
            };
        });

        const days = Math.max(1, Number(req.query.days) || 30);
        const trendStart = new Date(now);
        trendStart.setDate(now.getDate() - (days - 1));

        const trendTx = await prisma.transaction.findMany({
            where: {
                user_id: userId,
                type: { in: ['income', 'expense'] },
                is_removed: false,
                date: { gte: trendStart, lte: now }
            },
            select: { date: true, type: true, amount: true }
        });

        const trendTotals = {};
        for (const tx of trendTx) {
            const key = new Date(tx.date).toISOString().split('T')[0];
            if (!trendTotals[key]) trendTotals[key] = { income: 0, expense: 0 };
            if (tx.type === 'income') trendTotals[key].income += Number(tx.amount);
            if (tx.type === 'expense') trendTotals[key].expense += Number(tx.amount);
        }

        const trend = [];
        for (let i = days - 1; i >= 0; i -= 1) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const totals = trendTotals[key] || { income: 0, expense: 0 };
            trend.push({
                date: key,
                income: totals.income,
                expense: totals.expense
            });
        }

        const responseData = {
            month: { start: currentMonthStart.toISOString(), end: currentMonthEnd.toISOString() },
            totals: {
                income,
                expense,
                savings: income - expense
            },
            expenseByCategory,
            trend
        };

        if (isDefaultView) {
            await cacheService.setAnalytics(userId, responseData);
        }

        res.json(responseData);
    } catch (error) {
        console.error('Analytics Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
};

exports.getCalendarSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const year = Number(req.query.year) || now.getFullYear();
        const month = Number(req.query.month) || (now.getMonth() + 1);
        const monthIndex = Math.max(1, Math.min(12, month)) - 1;
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const txs = await prisma.transaction.findMany({
            where: { user_id: userId, is_removed: false, date: { gte: start, lte: end } },
            select: { date: true, type: true, amount: true }
        });

        const totalsByDay = {};
        for (const tx of txs) {
            const key = new Date(tx.date).toISOString().split('T')[0];
            if (!totalsByDay[key]) totalsByDay[key] = { income: 0, expense: 0 };
            if (tx.type === 'income' || tx.type === 'transfer_in') {
                totalsByDay[key].income += Number(tx.amount);
            }
            if (tx.type === 'expense' || tx.type === 'transfer_out') {
                totalsByDay[key].expense += Number(tx.amount);
            }
        }

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const days = [];
        for (let day = 1; day <= daysInMonth; day += 1) {
            const d = new Date(year, monthIndex, day);
            const key = d.toISOString().split('T')[0];
            const totals = totalsByDay[key] || { income: 0, expense: 0 };
            days.push({
                date: key,
                income: totals.income,
                expense: totals.expense,
                net: totals.income - totals.expense
            });
        }

        res.json({ year, month: monthIndex + 1, days });
    } catch (error) {
        console.error('Calendar Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar summary' });
    }
};

exports.importData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { accounts, categories, transactions, budgets, debts, goals, counterparties } = req.body;

        await prisma.$transaction(async (tx) => {
            // Импорт - это сложная штука. Самый простой вариант для "бэкапа" - это очистить и залить заново,
            // но это опасно. Лучше использовать upsert или просто createMany.
            // Для упрощения реализуем "добавление" (createMany).

            if (categories && categories.length > 0) {
                await tx.category.createMany({
                    data: categories.map(c => ({ ...c, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (accounts && accounts.length > 0) {
                await tx.account.createMany({
                    data: accounts.map(a => ({ ...a, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (counterparties && counterparties.length > 0) {
                await tx.counterparty.createMany({
                    data: counterparties.map(c => ({ ...c, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (transactions && transactions.length > 0) {
                await tx.transaction.createMany({
                    data: transactions.map(t => ({ ...t, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (budgets && budgets.length > 0) {
                await tx.budget.createMany({
                    data: budgets.map(b => ({ ...b, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (debts && debts.length > 0) {
                await tx.debt.createMany({
                    data: debts.map(d => ({ ...d, user_id: userId })),
                    skipDuplicates: true
                });
            }

            if (goals && goals.length > 0) {
                await tx.goal.createMany({
                    data: goals.map(g => ({ ...g, user_id: userId })),
                    skipDuplicates: true
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.refreshCurrencyRates = async (req, res) => {
    try {
        const CurrencyService = require('../services/currencyService');
        const rates = await CurrencyService.refreshUserRates(req.user.id);
        res.json({ success: true, rates });
    } catch (error) {
        logger.error('Refresh Rates Error', { error: error.message, userId: req.user.id });
        res.status(500).json({ error: error.message });
    }
};
