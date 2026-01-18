// src/controllers/financeController.js
const prisma = require('../lib/prisma');
const BalanceService = require('../services/balanceService');
const { ensureAccountOwnership, ensureCategoryOwnership, ensureOptionalCounterpartyOwnership } = require('../lib/ownership');
const AiService = require('../services/aiService');
// --- GOALS ---
exports.createGoal = async (req, res) => {
    try {
        const { name, icon, color, target_amount, current_amount, deadline } = req.body;

        const goal = await prisma.goal.create({
            data: {
                name,
                icon,
                color,
                target_amount: Number(target_amount) || 0,
                current_amount: Number(current_amount || 0),
                deadline: deadline ? new Date(deadline) : null,
                user_id: req.user.id
            }
        });
        res.json(goal);
    } catch (error) {
        console.error('Create Goal Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        // Добавил проверку user_id для безопасности (чтобы чужое не удалили)
        const goal = await prisma.goal.findFirst({
            where: { id: req.params.id, user_id: req.user.id, is_removed: false }
        });
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await prisma.goal.update({
            where: { id: goal.id },
            data: { is_removed: true, removed_at: new Date() }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Goal Error:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getAiInsight = async (req, res) => {
    // ?????????????????? ???????????????????? ????????, ?????????????? ???????????? ????????????????????????
    const headerLang = req.headers['x-app-lang'] || req.headers['accept-language'];
    const requestedLang = req.query.lang || headerLang || '';
    const normalizedLang = String(requestedLang).split(',')[0].trim().toLowerCase();
    const lang = normalizedLang.startsWith('uz') ? 'uz' : normalizedLang.startsWith('en') ? 'en' : 'ru';
    const insight = await AiService.getDailyInsight(req.user.id, lang);
    res.json(insight);
};
exports.topUpGoal = async (req, res) => {
    const { amount, accountId } = req.body;
    const goalId = req.params.id;
    const userId = req.user.id;
    const valAmount = Number(amount) || 0;

    if (valAmount <= 0 || valAmount > 1e10) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            await ensureAccountOwnership(userId, accountId, tx);

            // 1. Списываем деньги со счета через BalanceService
            await BalanceService.updateBalanceChecked(tx, accountId, valAmount, 'expense');

            // 2. Создаем транзакцию расхода
            const goal = await tx.goal.findFirst({ where: { id: goalId, user_id: userId, is_removed: false } });
            if (!goal) {
                throw new Error('Goal not found');
            }

            await tx.transaction.create({
                data: {
                    user_id: userId,
                    account_id: accountId,
                    amount: valAmount,
                    type: 'expense',
                    comment: `Пополнение цели: ${goal.name}`,
                    date: new Date()
                }
            });

            // 3. Обновляем цель
            const updatedGoal = await tx.goal.update({
                where: { id: goalId },
                data: {
                    current_amount: { increment: valAmount },
                    is_completed: (Number(goal.current_amount) + valAmount) >= Number(goal.target_amount)
                }
            });

            return updatedGoal;
        });
        res.json(result);
    } catch (error) {
        console.error('TopUp Goal Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.message === 'Goal not found') {
            return res.status(404).json({ error: 'Goal not found' });
        }
        res.status(500).json({ error: 'Top up failed' });
    }
};

// --- DEBTS ---
exports.createDebt = async (req, res) => {
    try {
        const { amount, paid_amount, due_date, counterparty_id, name, type, notes } = req.body;
        const valAmount = Number(amount) || 0;
        const valPaid = Number(paid_amount || 0);

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Invalid name' });
        }
        if (!['i_owe', 'owes_me'].includes(type)) {
            return res.status(400).json({ error: 'Invalid debt type' });
        }
        if (!Number.isFinite(valAmount) || valAmount <= 0 || valAmount > 1e10) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        if (!Number.isFinite(valPaid) || valPaid < 0 || valPaid > valAmount) {
            return res.status(400).json({ error: 'Invalid paid amount' });
        }

        const parsedDueDate = due_date ? new Date(due_date) : null;
        if (due_date && Number.isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ error: 'Invalid due date' });
        }

        await ensureOptionalCounterpartyOwnership(req.user.id, counterparty_id, prisma);

        const debt = await prisma.debt.create({
            data: {
                name: name.trim(),
                type,
                notes: notes || null,
                amount: valAmount,
                paid_amount: valPaid,
                due_date: parsedDueDate,
                counterparty_id: counterparty_id || null,
                user_id: req.user.id
            }
        });
        res.json(debt);
    } catch (error) {
        console.error('Create Debt Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDebt = async (req, res) => {
    try {
        const debt = await prisma.debt.findFirst({
            where: { id: req.params.id, user_id: req.user.id, is_removed: false }
        });
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        await prisma.debt.update({
            where: { id: debt.id },
            data: { is_removed: true, removed_at: new Date() }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Debt Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.payDebt = async (req, res) => {
    const { amount, accountId } = req.body;
    const debtId = req.params.id;
    const userId = req.user.id;
    const valAmount = Number(amount) || 0;

    if (valAmount <= 0 || valAmount > 1e10) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const debt = await tx.debt.findFirst({ where: { id: debtId, user_id: userId, is_removed: false } });
            if (!debt) {
                throw new Error('Debt not found');
            }

            await ensureAccountOwnership(userId, accountId, tx);

            // Логика: Я должен -> Плачу -> Расход. Мне должны -> Платят мне -> Доход.
            const type = debt.type === 'i_owe' ? 'expense' : 'income';

            // Обновляем баланс через BalanceService
            if (type === 'expense') {
                await BalanceService.updateBalanceChecked(tx, accountId, valAmount, type);
            } else {
                await BalanceService.updateBalance(tx, accountId, valAmount, type);
            }

            // Создаем транзакцию
            await tx.transaction.create({
                data: {
                    user_id: userId,
                    account_id: accountId,
                    amount: valAmount,
                    type: type,
                    comment: `Долг: ${debt.name}`,
                    date: new Date()
                }
            });

            // Обновляем долг
            const updatedDebt = await tx.debt.update({
                where: { id: debtId },
                data: {
                    paid_amount: { increment: valAmount },
                    is_closed: (Number(debt.paid_amount) + valAmount) >= Number(debt.amount)
                }
            });

            return updatedDebt;
        });

        // SYNC: Если долг связанный, синхронизируем платеж
        if (result.is_linked) {
            try {
                const debtSyncService = require('../services/debtSyncService');
                await debtSyncService.syncDebtPayment(debtId, valAmount, userId);
            } catch (syncError) {
                console.error('Sync error (non-critical):', syncError);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Pay Debt Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        if (error.message === 'Debt not found') {
            return res.status(404).json({ error: 'Debt not found' });
        }
        res.status(500).json({ error: 'Payment failed' });
    }
};

// --- BUDGETS ---
exports.upsertBudget = async (req, res) => {
    const { category_id, amount } = req.body;
    try {

        // Сначала ищем существующий
        const existing = await prisma.budget.findFirst({
            where: { user_id: req.user.id, category_id: category_id, period: 'month' }
        });

        let budget;
        if (existing) {
            // Обновляем
            budget = await prisma.budget.update({
                where: { id: existing.id },
                data: { amount: valAmount }
            });
        } else {
            // Создаем
            budget = await prisma.budget.create({
                data: { user_id: req.user.id, category_id, amount: valAmount, period: 'month' }
            });
        }
        res.json(budget);
    } catch (error) {
        console.error('Upsert Budget Error:', error);
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteBudget = async (req, res) => {
    try {
        const budget = await prisma.budget.findFirst({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        await prisma.budget.delete({ where: { id: budget.id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Budget Error:', error);
        res.status(500).json({ error: error.message });
    }
};
