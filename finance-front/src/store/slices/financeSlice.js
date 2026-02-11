import api from '../../api/axios';
import { toast } from '../../components/ui/Toast';

export const createFinanceSlice = (set, get) => ({
    budgets: [],
    debts: [],
    recurring: [],
    goals: [],

    // ========================
    // 🎯 GOALS (Цели)
    // ========================

    addGoal: async (form) => {
        try {
            const payload = {
                ...form,
                target_amount: Number(form.target_amount),
                deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined
            };
            const { data } = await api.post('/goals', payload);
            set(state => ({ goals: [...state.goals, data] }));
            toast.success('Цель создана');
        } catch (e) {
            console.error(e);
            toast.error('Ошибка создания цели');
        }
    },

    deleteGoal: async (id) => {
        try {
            await api.delete(`/goals/${id}`);
            set(state => ({ goals: state.goals.filter(g => g.id !== id) }));
            toast.success('Цель удалена');
        } catch (e) {
            toast.error('Не удалось удалить цель');
        }
    },

    addMoneyToGoal: async (goalId, amount, accountId) => {
        if (!amount || !accountId) return toast.error('Заполните данные');

        try {
            // Бэкенд сам спишет деньги и обновит цель
            const { data } = await api.post(`/goals/${goalId}/topup`, { amount: Number(amount), accountId });

            // Обновляем цель в списке
            set(state => ({
                goals: state.goals.map(g => g.id === goalId ? data : g)
            }));

            // Обновляем балансы (так как деньги ушли со счета)
            get().fetchData();

            toast.success('Цель пополнена');
        } catch (e) {
            toast.error('Ошибка пополнения');
        }
    },

    // ========================
    // 💸 DEBTS (Долги)
    // ========================

    addDebt: async (form) => {
        try {
            const payload = {
                name: form.name,
                amount: Number(form.amount),
                type: form.type,
                due_date: form.due_date || undefined,
                account_id: form.account_id || null
            };
            const { data } = await api.post('/debts', payload);
            set(state => ({ debts: [data, ...state.debts] }));
            toast.success('Долг записан');
        } catch (e) {
            toast.error('Ошибка создания долга');
        }
    },

    deleteDebt: async (id) => {
        try {
            await api.delete(`/debts/${id}`);
            set(state => ({ debts: state.debts.filter(d => d.id !== id) }));
            toast.success('Запись удалена');
        } catch (e) {
            toast.error('Ошибка удаления');
        }
    },

    payDebt: async (debtId, amount, accountId) => {
        if (!amount || !accountId) return;

        try {
            const { data } = await api.post(`/debts/${debtId}/pay`, { amount, accountId });

            // Бэк возвращает обновленный объект долга
            set(state => ({
                debts: state.debts.map(d => d.id === debtId ? data : d)
            }));

            // Обновляем балансы (деньги пришли или ушли)
            get().fetchData();

            if (data.is_closed) toast.success('Долг полностью закрыт! 🎉');
            else toast.success('Платеж записан');

        } catch (e) {
            toast.error('Ошибка записи платежа');
        }
    },

    // ========================
    // 📊 BUDGETS (Бюджеты)
    // ========================

    saveBudget: async (categoryId, amount) => {
        try {
            // Upsert логика на бэкенде
            const { data } = await api.post('/budgets', { category_id: categoryId, amount: Number(amount) });

            set(state => {
                const existingIndex = state.budgets.findIndex(b => b.category_id === categoryId);
                let newBudgets = [...state.budgets];

                if (existingIndex >= 0) {
                    newBudgets[existingIndex] = data; // Заменяем
                } else {
                    newBudgets.push(data); // Добавляем
                }
                return { budgets: newBudgets };
            });

            toast.success('Бюджет установлен');
        } catch (e) {
            toast.error('Не удалось сохранить бюджет');
        }
    },

    deleteBudget: async (id) => {
        try {
            await api.delete(`/budgets/${id}`);
            set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }));
            toast.success('Бюджет удален');
        } catch (e) {
            toast.error('Ошибка удаления');
        }
    },

    getBudgetProgress: (categoryId) => {
        // Эта функция остается локальной, так как она только СЧИТАЕТ прогресс
        // на основе уже загруженных данных (транзакции и бюджеты)
        const { budgets, transactions, categories, analyticsSummary } = get();
        const budget = budgets.find(b => b.category_id === categoryId);

        if (!budget) return null;

        let spent = 0;
        if (analyticsSummary && analyticsSummary.expenseByCategory) {
            const summaryItem = analyticsSummary.expenseByCategory.find(item => item.category_id === categoryId);
            spent = summaryItem ? Number(summaryItem.amount) : 0;
        } else {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            spent = transactions
                .filter(t =>
                    t.category_id === categoryId &&
                    t.type === 'expense' &&
                    new Date(t.date) >= startOfMonth &&
                    new Date(t.date) <= endOfMonth
                )
                .reduce((sum, t) => sum + Number(t.amount), 0);
        }

        const cat = categories.find(c => c.id === categoryId);

        return {
            spent,
            limit: Number(budget.amount),
            remaining: Math.max(0, Number(budget.amount) - spent),
            percent: (spent / Number(budget.amount)) * 100,
            isOver: spent > Number(budget.amount),
            overAmount: Math.max(0, spent - Number(budget.amount)),
            categoryName: cat ? cat.name : 'Категория'
        };
    },

    // ========================
    // 🔄 RECURRING (Подписки)
    // ========================

    addRecurring: async (form) => {
        try {
            const { data } = await api.post('/recurring', form);
            set(s => ({ recurring: [...s.recurring, data] }));
            toast.success('Подписка добавлена');
            return { success: true };
        } catch (e) {
            console.error(e);
            toast.error('Ошибка добавления подписки');
            return { success: false, error: e };
        }
    },

    updateRecurring: async (id, updates) => {
        try {
            const { data } = await api.put(`/recurring/${id}`, updates);
            set(s => ({ recurring: s.recurring.map(r => r.id === id ? data : r) }));
            toast.success('Подписка обновлена');
        } catch (e) {
            console.error(e);
            toast.error('Ошибка обновления');
        }
    },

    deleteRecurring: async (id) => {
        try {
            await api.delete(`/recurring/${id}`);
            set(s => ({ recurring: s.recurring.filter(r => r.id !== id) }));
            toast.success('Подписка удалена');
        } catch (e) {
            console.error(e);
            toast.error('Ошибка удаления');
        }
    }
});
