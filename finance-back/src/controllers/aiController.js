const prisma = require('../lib/prisma');
const AiHelper = require('../services/aiHelper');
const cacheService = require('../services/cacheService');
const DAILY_CACHE_TTL = 24 * 60 * 60; // 24 Hours

const getLang = (req) => {
    const headerLang = req.headers['x-app-lang'] || req.headers['accept-language'];
    const requestedLang = req.query.lang || headerLang || '';
    return AiHelper.normalizeLang(String(requestedLang).split(',')[0].trim());
};

const findByName = (list, name, extraFilter) => {
    if (!name) return null;
    const target = String(name).toLowerCase();
    const filtered = extraFilter ? list.filter(extraFilter) : list;
    return filtered.find(item => String(item.name).toLowerCase() === target)
        || filtered.find(item => String(item.name).toLowerCase().includes(target))
        || filtered.find(item => target.includes(String(item.name).toLowerCase()))
        || null;
};

const getMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { now, start, end };
};

exports.suggestTransactionMeta = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'expense', comment = '', amount = null } = req.body || {};
        const lang = getLang(req);

        const [categories, counterparties, recentTxs] = await Promise.all([
            prisma.category.findMany({
                where: { user_id: userId },
                select: { id: true, name: true, type: true, icon: true, color: true }
            }),
            prisma.counterparty.findMany({
                where: { user_id: userId },
                select: { id: true, name: true, icon: true }
            }),
            prisma.transaction.findMany({
                where: { user_id: userId, is_removed: false },
                orderBy: { date: 'desc' },
                take: 40,
                select: {
                    comment: true,
                    type: true,
                    amount: true,
                    category_id: true,
                    counterparty_id: true
                }
            })
        ]);

        const recentMapped = recentTxs.map(tx => ({
            comment: tx.comment || '',
            type: tx.type,
            amount: Number(tx.amount),
            category: categories.find(c => c.id === tx.category_id)?.name || null,
            counterparty: counterparties.find(c => c.id === tx.counterparty_id)?.name || null
        }));

        const fallbackCategory = findByName(categories, comment, c => c.type === type)
            || categories.filter(c => c.type === type)[0]
            || null;
        const fallbackCounterparty = findByName(counterparties, comment);

        const fallback = {
            category: fallbackCategory ? { id: fallbackCategory.id, name: fallbackCategory.name } : null,
            counterparty: fallbackCounterparty ? { id: fallbackCounterparty.id, name: fallbackCounterparty.name } : null,
            new_category_suggestions: [],
            reason: null,
            confidence: 0.3
        };

        if (!AiHelper.hasApiKey()) {
            return res.json(fallback);
        }

        const prompt = [
            AiHelper.buildLanguagePrefix(lang),
            'You are a financial categorization assistant.',
            'Pick the best category and counterparty for the transaction.',
            'If no category fits, propose up to 2 new category suggestions.',
            'Return JSON only.',
            '',
            'Transaction:',
            JSON.stringify({ type, comment, amount }),
            '',
            'Known categories:',
            JSON.stringify(categories.map(c => ({ name: c.name, type: c.type }))),
            '',
            'Known counterparties:',
            JSON.stringify(counterparties.map(c => ({ name: c.name }))),
            '',
            'Recent examples:',
            JSON.stringify(recentMapped),
            '',
            'JSON schema:',
            '{',
            '  "category": { "name": "string or null" },',
            '  "counterparty": { "name": "string or null" },',
            '  "new_category_suggestions": [',
            '     { "name": "string", "type": "expense|income", "icon": "emoji", "color": "#hex" }',
            '  ],',
            '  "reason": "string",',
            '  "confidence": 0-1',
            '}'
        ].join('\n');

        const aiResult = await AiHelper.generateJson(prompt, null);
        if (!aiResult) {
            return res.json(fallback);
        }

        const selectedCategory = findByName(categories, aiResult.category?.name, c => c.type === type);
        const selectedCounterparty = findByName(counterparties, aiResult.counterparty?.name);

        const suggestions = Array.isArray(aiResult.new_category_suggestions)
            ? aiResult.new_category_suggestions.filter(item => item?.name)
            : [];

        const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
        const filteredSuggestions = suggestions.filter(item => !existingNames.has(String(item.name).toLowerCase()));

        res.json({
            category: selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name } : null,
            counterparty: selectedCounterparty ? { id: selectedCounterparty.id, name: selectedCounterparty.name } : null,
            new_category_suggestions: filteredSuggestions.slice(0, 2),
            reason: aiResult.reason || null,
            confidence: Number(aiResult.confidence) || 0.4
        });
    } catch (error) {
        console.error('AI Suggest Transaction Error:', error);
        res.status(500).json({ error: 'Failed to suggest transaction' });
    }
};

exports.getSmartAlerts = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);

        // 1. Check Cache (One request per day)
        const dateKey = new Date().toISOString().split('T')[0];
        const cacheKey = `ai:alerts:${userId}:${lang}:${dateKey}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const start7 = new Date(now);
        start7.setDate(now.getDate() - 6);
        const start14 = new Date(now);
        start14.setDate(now.getDate() - 13);
        const start60 = new Date(now);
        start60.setDate(now.getDate() - 59);

        const expenseTxs = await prisma.transaction.findMany({
            where: {
                user_id: userId,
                type: 'expense',
                is_removed: false,
                date: { gte: start60 }
            },
            select: {
                id: true,
                amount: true,
                comment: true,
                counterparty_id: true,
                date: true
            },
            orderBy: { date: 'desc' }
        });

        const sumRange = (startDate, endDate) => expenseTxs
            .filter(tx => tx.date >= startDate && tx.date <= endDate)
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const start7End = now;
        const start14End = new Date(now);
        start14End.setDate(now.getDate() - 7);

        const last7 = sumRange(start7, start7End);
        const prev7 = sumRange(start14, start14End);

        const alerts = [];

        if (prev7 > 0 && last7 > prev7 * 1.3) {
            alerts.push({
                code: 'spike',
                type: 'warning',
                data: {
                    current: Math.round(last7),
                    previous: Math.round(prev7),
                    percent: Math.round((last7 / prev7 - 1) * 100)
                }
            });
        }

        const avg30 = expenseTxs.length > 0
            ? expenseTxs.reduce((sum, tx) => sum + Number(tx.amount), 0) / expenseTxs.length
            : 0;
        const biggest = expenseTxs.find(tx => Number(tx.amount) >= avg30 * 2.5 && tx.date >= start7);
        if (biggest) {
            alerts.push({
                code: 'big_expense',
                type: 'danger',
                data: { amount: Math.round(Number(biggest.amount)), comment: biggest.comment || '' }
            });
        }

        const recent = expenseTxs.filter(tx => tx.date >= start7);
        const previous = expenseTxs.filter(tx => tx.date < start7);
        const prevCounterparties = new Set(previous.map(tx => tx.counterparty_id).filter(Boolean));
        const newCp = recent.find(tx => tx.counterparty_id && !prevCounterparties.has(tx.counterparty_id));
        if (newCp) {
            alerts.push({
                code: 'new_counterparty',
                type: 'info',
                data: { amount: Math.round(Number(newCp.amount)), comment: newCp.comment || '' }
            });
        }

        const recurringMap = {};
        for (const tx of expenseTxs) {
            const key = `${tx.comment || ''}|${Math.round(Number(tx.amount))}`;
            recurringMap[key] = (recurringMap[key] || 0) + 1;
        }
        const recurring = Object.entries(recurringMap).find(([, count]) => count >= 3);
        if (recurring) {
            const [key, count] = recurring;
            const [comment, amount] = key.split('|');
            alerts.push({
                code: 'recurring',
                type: 'warning',
                data: { amount: Number(amount) || 0, comment, count }
            });
        }

        if (!AiHelper.hasApiKey() || alerts.length === 0) {
            return res.json({ alerts });
        }

        const prompt = [
            AiHelper.buildLanguagePrefix(lang),
            'You are a finance assistant. Generate short alert titles and messages.',
            'Return JSON only.',
            'Alerts input:',
            JSON.stringify(alerts),
            'JSON schema:',
            '{ "alerts": [ { "code": "string", "type": "info|warning|danger|success", "title": "string", "message": "string" } ] }'
        ].join('\n');

        const aiResult = await AiHelper.generateJson(prompt, null);
        if (!aiResult?.alerts) {
            return res.json({ alerts });
        }

        const merged = alerts.map(alert => {
            const match = aiResult.alerts.find(item => item.code === alert.code);
            return match ? { ...alert, title: match.title, message: match.message } : alert;
        });

        const response = { alerts: merged };
        await cacheService.set(cacheKey, response, DAILY_CACHE_TTL);
        res.json(response);
    } catch (error) {
        console.error('AI Alerts Error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

exports.getForecast = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);

        const dateKey = new Date().toISOString().split('T')[0];
        const cacheKey = `ai:forecast:${userId}:${lang}:${dateKey}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const { now, start, end } = getMonthRange();
        const daysPassed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const [thisMonthAgg, lastMonthAgg] = await Promise.all([
            prisma.transaction.aggregate({
                where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: start, lte: end } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: {
                    user_id: userId,
                    type: 'expense',
                    is_removed: false,
                    date: {
                        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                        lte: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
                    }
                },
                _sum: { amount: true }
            })
        ]);

        const currentExpense = Number(thisMonthAgg._sum.amount) || 0;
        const lastMonthExpense = Number(lastMonthAgg._sum.amount) || 0;
        const dailyAvg = daysPassed ? currentExpense / daysPassed : 0;
        const forecastExpense = Math.round(dailyAvg * daysInMonth);

        const response = {
            currentExpense,
            lastMonthExpense,
            dailyAvg: Math.round(dailyAvg),
            forecastExpense,
            daysPassed,
            daysInMonth
        };

        if (!AiHelper.hasApiKey()) {
            forecastCache.set(cacheKey, { at: Date.now(), data: response });
            return res.json(response);
        }

        let aiMessage = null;
        try {
            const prompt = [
                AiHelper.buildLanguagePrefix(lang),
                'Generate a short forecast message (1-2 sentences).',
                'Use the data and avoid emojis.',
                JSON.stringify(response),
                'JSON schema:',
                '{ "message": "string" }'
            ].join('\n');
            const aiResult = await AiHelper.generateJson(prompt, null);
            aiMessage = aiResult?.message || null;
        } catch (aiError) {
            console.error('AI Forecast Error:', aiError);
        }

        const payload = { ...response, message: aiMessage };
        await cacheService.set(cacheKey, payload, DAILY_CACHE_TTL);
        res.json(payload);
    } catch (error) {
        console.error('AI Forecast Error:', error);
        res.status(500).json({ error: 'Failed to fetch forecast' });
    }
};

exports.getAnalyticsExplanation = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);

        const dateKey = new Date().toISOString().split('T')[0];
        const cacheKey = `ai:analytics:${userId}:${lang}:${dateKey}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const { start, end } = getMonthRange();

        const [incomeAgg, expenseAgg, expenseGroups] = await Promise.all([
            prisma.transaction.aggregate({
                where: { user_id: userId, type: 'income', is_removed: false, date: { gte: start, lte: end } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: start, lte: end } },
                _sum: { amount: true }
            }),
            prisma.transaction.groupBy({
                by: ['category_id'],
                where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: start, lte: end } },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } },
                take: 3
            })
        ]);

        const categories = await prisma.category.findMany({
            where: { id: { in: expenseGroups.map(g => g.category_id).filter(Boolean) } },
            select: { id: true, name: true }
        });

        const topCategories = expenseGroups.map(group => ({
            name: categories.find(c => c.id === group.category_id)?.name || 'Unknown',
            amount: Number(group._sum.amount) || 0
        }));

        const summary = {
            income: Number(incomeAgg._sum.amount) || 0,
            expense: Number(expenseAgg._sum.amount) || 0,
            savings: (Number(incomeAgg._sum.amount) || 0) - (Number(expenseAgg._sum.amount) || 0),
            topCategories
        };

        if (!AiHelper.hasApiKey()) {
            return res.json(summary);
        }

        let aiMessage = null;
        try {
            const prompt = [
                AiHelper.buildLanguagePrefix(lang),
                'Explain the analytics in 1-2 sentences.',
                JSON.stringify(summary),
                'JSON schema:',
                '{ "message": "string" }'
            ].join('\n');
            const aiResult = await AiHelper.generateJson(prompt, null);
            aiMessage = aiResult?.message || null;
        } catch (aiError) {
            console.error('AI Analytics Explanation Error:', aiError);
        }

        const response = { ...summary, message: aiMessage };
        await cacheService.set(cacheKey, response, DAILY_CACHE_TTL);
        res.json(response);
    } catch (error) {
        console.error('AI Analytics Explanation Error:', error);
        res.status(500).json({ error: 'Failed to explain analytics' });
    }
};

exports.getGoalsAdvice = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);

        const dateKey = new Date().toISOString().split('T')[0];
        const cacheKey = `ai:goals:${userId}:${lang}:${dateKey}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const goals = await prisma.goal.findMany({
            where: { user_id: userId, is_removed: false },
            select: { id: true, name: true, target_amount: true, current_amount: true, deadline: true, is_completed: true }
        });

        const debts = await prisma.debt.findMany({
            where: { user_id: userId, is_removed: false, is_closed: false },
            select: { id: true, name: true, amount: true, paid_amount: true, type: true }
        });

        const payload = {
            goals: goals.map(g => ({
                name: g.name,
                target: Number(g.target_amount),
                current: Number(g.current_amount),
                deadline: g.deadline ? g.deadline.toISOString().split('T')[0] : null,
                completed: g.is_completed
            })),
            debts: debts.map(d => ({
                name: d.name,
                remaining: Number(d.amount) - Number(d.paid_amount),
                type: d.type
            }))
        };

        if (!AiHelper.hasApiKey()) {
            return res.json({ ...payload, message: null });
        }

        let aiResult = null;
        try {
            const prompt = [
                AiHelper.buildLanguagePrefix(lang),
                'Give one short actionable tip to reach goals faster and handle debts.',
                'Return JSON only.',
                JSON.stringify(payload),
                '{ "title": "string", "message": "string", "mood": "success|warning|neutral" }'
            ].join('\n');
            aiResult = await AiHelper.generateJson(prompt, null);
        } catch (aiError) {
            console.error('AI Goals Advice Error:', aiError);
        }

        const response = { ...payload, ...(aiResult || {}) };
        await cacheService.set(cacheKey, response, DAILY_CACHE_TTL);
        res.json(response);
    } catch (error) {
        console.error('AI Goals Advice Error:', error);
        res.status(500).json({ error: 'Failed to fetch goals advice' });
    }
};

exports.getDebtsAdvice = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);

        const dateKey = new Date().toISOString().split('T')[0];
        const cacheKey = `ai:debts:${userId}:${lang}:${dateKey}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const debts = await prisma.debt.findMany({
            where: { user_id: userId, is_removed: false, is_closed: false },
            select: { id: true, name: true, amount: true, paid_amount: true, type: true, due_date: true }
        });

        const payload = debts.map(d => ({
            name: d.name,
            remaining: Number(d.amount) - Number(d.paid_amount),
            type: d.type,
            due_date: d.due_date ? d.due_date.toISOString().split('T')[0] : null
        }));

        if (!AiHelper.hasApiKey()) {
            return res.json({ debts: payload, message: null });
        }

        const prompt = [
            AiHelper.buildLanguagePrefix(lang),
            'Suggest the best repayment order (1 short paragraph).',
            'Return JSON only.',
            JSON.stringify({ debts: payload }),
            '{ "message": "string", "strategy": "string" }'
        ].join('\n');

        let aiResult = null;
        try {
            aiResult = await AiHelper.generateJson(prompt, null);
        } catch (aiError) {
            console.error('AI Debts Advice Error:', aiError);
        }

        const response = { debts: payload, ...(aiResult || {}) };
        await cacheService.set(cacheKey, response, DAILY_CACHE_TTL);
        res.json(response);
    } catch (error) {
        console.error('AI Debts Advice Error:', error);
        res.status(500).json({ error: 'Failed to fetch debts advice' });
    }
};

exports.getCategorySuggestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const lang = getLang(req);
        const categories = await prisma.category.findMany({
            where: { user_id: userId },
            select: { name: true, type: true }
        });

        const uncategorized = await prisma.transaction.findMany({
            where: { user_id: userId, is_removed: false, category_id: null },
            select: { comment: true, amount: true, type: true },
            orderBy: { date: 'desc' },
            take: 25
        });

        const payload = {
            existing: categories,
            uncategorized: uncategorized.map(tx => ({
                comment: tx.comment || '',
                amount: Number(tx.amount),
                type: tx.type
            }))
        };

        if (!AiHelper.hasApiKey()) {
            return res.json({ suggestions: [] });
        }

        const prompt = [
            AiHelper.buildLanguagePrefix(lang),
            'Suggest up to 3 new spending categories based on uncategorized transactions.',
            'Return JSON only.',
            JSON.stringify(payload),
            '{ "suggestions": [ { "name": "string", "type": "expense|income", "icon": "emoji", "color": "#hex" } ] }'
        ].join('\n');

        let aiResult = { suggestions: [] };
        try {
            aiResult = await AiHelper.generateJson(prompt, { suggestions: [] });
        } catch (aiError) {
            console.error('AI Category Suggestions Error:', aiError);
        }
        const existing = new Set(categories.map(c => c.name.toLowerCase()));
        const filtered = (aiResult.suggestions || []).filter(item => item?.name && !existing.has(String(item.name).toLowerCase()));
        res.json({ suggestions: filtered.slice(0, 3) });
    } catch (error) {
        console.error('AI Category Suggestions Error:', error);
        res.status(500).json({ error: 'Failed to fetch category suggestions' });
    }
};
