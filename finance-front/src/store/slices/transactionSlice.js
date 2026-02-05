import api from '../../api/axios';
import { toast } from '../../components/ui/Toast';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval } from 'date-fns';
import i18n from '../../i18n';

export const createTransactionSlice = (set, get) => ({
    transactions: [],
    recentTransactions: [],
    hasMore: true,
    currentPage: 0,
    isLoadingTransactions: false,

    // Получение последних транзакций (обновление Dashboard)
    fetchRecentTransactions: async () => {
        try {
            // Мы берем данные из общего эндпоинта дашборда, чтобы сэкономить запросы
            const { data } = await api.get('/dashboard');
            if (data.recentTransactions) {
                set({ recentTransactions: data.recentTransactions });
            }
        } catch (e) {
            console.error("Error fetching recent transactions:", e);
        }
    },

    // Обновление транзакции
    updateTransaction: async (id, updates) => {
        try {
            const { data } = await api.put(`/transactions/${id}`, updates);

            set(state => ({
                transactions: state.transactions.map(t => t.id === id ? data : t),
                recentTransactions: state.recentTransactions.map(t => t.id === id ? data : t)
            }));

            toast.success(i18n.t('toasts.tx_updated'));
            get().fetchData();
            return true;
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.update_error'));
            return false;
        }
    },

    // Загрузка истории транзакций (с пагинацией и фильтрами)
    fetchTransactions: async ({ page = 0, limit = 20, filters = {}, append = false } = {}) => {
        set({ isLoadingTransactions: true });
        try {
            const { data } = await api.get('/transactions', { params: { page, limit, ...filters } });

            // Backend now returns { data: [], meta: { ... } }
            const txs = data.data || [];
            const meta = data.meta || {};

            set(state => ({
                transactions: append ? [...state.transactions, ...txs] : txs,
                hasMore: meta.page < meta.totalPages - 1, // 0-indexed page in backend? Let's assume 0-indexed as per controller default
                currentPage: page,
                isLoadingTransactions: false,
                totalTransactions: meta.total
            }));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.tx_load_error'));
            set({ isLoadingTransactions: false });
        }
    },

    // --- ACTIONS (Создание и Удаление) ---

    addTransaction: async (form) => {
        try {
            const payload = {
                account_id: form.account_id,
                category_id: form.category_id,
                counterparty_id: form.counterparty_id || null,
                amount: Number(form.amount),
                type: form.type,
                comment: form.comment || '',
                date: form.date ? new Date(form.date).toISOString() : new Date().toISOString()
            };

            // Отправляем запрос на сервер
            const { data } = await api.post('/transactions', payload);

            if (data) {
                // Сервер вернул созданную транзакцию. Добавляем её в начало списка.
                set(state => ({
                    transactions: [data, ...state.transactions],
                    recentTransactions: [data, ...state.recentTransactions].slice(0, 5) // Обновляем и виджет на главной
                }));

                // Обновляем все данные (балансы счетов изменились)
                // Это самый надежный способ синхронизировать фронт и бэк
                get().fetchData();

                if (!form.silent) toast.success(i18n.t('toasts.tx_added'));
                return true;
            }
        } catch (e) {
            console.error('Create Transaction Error:', e);
            if (e.response && e.response.data) {
                console.error('Server Error Details:', e.response.data);
                toast.error(`Error: ${e.response.data.details || e.response.data.error || 'Unknown error'}`);
            } else {
                toast.error(i18n.t('toasts.create_error'));
            }
            return false;
        }
    },

    deleteTransaction: async (id) => {
        try {
            await api.delete(`/transactions/${id}`);

            set(state => ({
                transactions: state.transactions.filter(t => t.id !== id),
                recentTransactions: state.recentTransactions.filter(t => t.id !== id)
            }));

            get().fetchData();
            toast.success(i18n.t('toasts.tx_deleted'));
        } catch (e) {
            console.error(e);
            toast.error("Error deleting transaction");
        }
    },

    addTransfer: async (fromAccountId, toAccountId, amount, comment) => {
        try {
            const payload = {
                from_account_id: fromAccountId,
                to_account_id: toAccountId,
                amount: Number(amount),
                comment: comment || 'Transfer',
                date: new Date().toISOString()
            };

            // Отправляем запрос на специальный эндпоинт трансфера
            const { data } = await api.post('/transactions/transfer', payload);

            // Если сервер вернул успех
            if (data && (data.success || data.txOut)) {
                // Полностью обновляем данные, так как трансфер меняет балансы двух счетов
                // и создает две транзакции
                await get().fetchData();

                toast.success(i18n.t('toasts.transfer_success'));
                return { success: true };
            }
        } catch (err) {
            console.error('Transfer Error:', err);
            // Пытаемся достать текст ошибки от сервера
            const msg = err.response?.data?.error || i18n.t('toasts.transfer_error');
            toast.error(msg);
            return { success: false };
        }
    },

    // --- ANALYTICS GETTERS (Синхронные функции для UI) ---
    // Эти функции работают с уже загруженными в стейт данными

    getIncomeByPeriod: (period = 'today') => {
        const { transactions } = get();
        const range = getPeriodRange(period);
        return transactions
            .filter(t => t.type === 'income' && isInRange(t.date, range))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    },

    getExpenseByPeriod: (period = 'today') => {
        const { transactions } = get();
        const range = getPeriodRange(period);
        return transactions
            .filter(t => t.type === 'expense' && isInRange(t.date, range))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    },

    getSpendingTrends: (period = 'month') => {
        const { transactions } = get();
        const today = new Date();
        const result = [];

        let days = 30;
        if (period === 'week') days = 7;

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

            // Фильтруем транзакции за конкретный день
            const dayTxs = transactions.filter(t => t.date.startsWith(dateStr));

            const income = dayTxs
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expense = dayTxs
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            result.push({
                date: dateStr,
                name: dateStr.split('-').slice(1).reverse().join('.'), // DD.MM
                income,
                expense
            });
        }
        return result;
    },

    getMonthlyIncome: () => {
        const { transactions } = get();
        const now = new Date();
        const start = startOfMonth(now);
        const end = new Date(); // До текущего момента

        return transactions
            .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), { start, end }))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    },

    getMonthlyExpense: () => {
        const { transactions } = get();
        const now = new Date();
        const start = startOfMonth(now);
        const end = new Date();

        return transactions
            .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), { start, end }))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    },

    getMonthlyProfit: () => {
        const income = get().getMonthlyIncome();
        const expense = get().getMonthlyExpense();
        return income - expense;
    },

    getBudgetCompletion: () => {
        const { budgets } = get();
        if (!budgets || budgets.length === 0) return 0;

        let totalCompletion = 0;
        let count = 0;

        budgets.forEach(budget => {
            const progress = get().getBudgetProgress(budget.category_id);
            if (progress) {
                // Ограничиваем 100%, чтобы перерасход не портил среднюю статистику
                totalCompletion += Math.min(progress.percent, 100);
                count++;
            }
        });

        return count > 0 ? Math.round(totalCompletion / count) : 0;
    },

    getTopExpenseCategories: (limit = 3) => {
        const { transactions, categories } = get();
        const now = new Date();
        const start = startOfMonth(now);
        const end = new Date();

        // Берем только расходы за этот месяц
        const monthExpenses = transactions.filter(t =>
            t.type === 'expense' &&
            t.category_id &&
            isWithinInterval(new Date(t.date), { start, end })
        );

        // Считаем суммы по категориям
        const categoryTotals = {};
        monthExpenses.forEach(t => {
            if (!categoryTotals[t.category_id]) {
                categoryTotals[t.category_id] = 0;
            }
            categoryTotals[t.category_id] += Number(t.amount);
        });

        // Превращаем в массив, сортируем и берем топ-N
        const sortedCategories = Object.entries(categoryTotals)
            .map(([categoryId, amount]) => {
                const category = categories.find(c => c.id === categoryId);
                return {
                    categoryId,
                    name: category?.name || 'Неизвестно',
                    icon: category?.icon || '📌',
                    amount,
                };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);

        // Считаем проценты от общих расходов
        const totalExpenses = get().getMonthlyExpense();

        return sortedCategories.map(cat => ({
            ...cat,
            percentage: totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
        }));
    },

    getTopUsedCategories: (limit = 6) => {
        const { transactions, categories } = get();
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        // Считаем частоту использования категорий
        const categoryCounts = {};
        transactions
            .filter(t => t.type === 'expense' && t.category_id && new Date(t.date) >= last30Days)
            .forEach(t => {
                if (!categoryCounts[t.category_id]) {
                    categoryCounts[t.category_id] = 0;
                }
                categoryCounts[t.category_id]++;
            });

        // Сортируем
        const sortedCategories = Object.entries(categoryCounts)
            .map(([categoryId, count]) => {
                const category = categories.find(c => c.id === categoryId);
                return {
                    categoryId,
                    name: category?.name || 'Неизвестно',
                    icon: category?.icon || '📌',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        // Если данных мало, добиваем дефолтными (для красоты UI при первом запуске)
        const defaultCategories = [
            { name: 'Кофе', icon: '☕' },
            { name: 'Продукты', icon: '🛒' },
            { name: 'Транспорт', icon: '🚕' },
            { name: 'Обед', icon: '🍽️' },
            { name: 'Такси', icon: '🚖' },
            { name: 'Кино', icon: '🎬' },
        ];

        while (sortedCategories.length < limit && defaultCategories.length > 0) {
            const defaultCat = defaultCategories.shift();
            // Проверяем, есть ли такая категория у юзера по имени
            const existingCat = categories.find(c => c.name.toLowerCase().includes(defaultCat.name.toLowerCase()));

            // Если есть и еще не в списке - добавляем
            if (existingCat && !sortedCategories.find(sc => sc.categoryId === existingCat.id)) {
                sortedCategories.push({
                    categoryId: existingCat.id,
                    name: existingCat.name,
                    icon: existingCat.icon,
                    count: 0,
                });
            }
            // Если нет - просто добавляем как "предложение" (id: null)
            else if (!existingCat) {
                sortedCategories.push({
                    categoryId: null, // При клике можно предложить создать
                    name: defaultCat.name,
                    icon: defaultCat.icon,
                    count: 0,
                });
            }
        }

        return sortedCategories;
    }
});

// Хелперы для работы с датами
function getPeriodRange(period) {
    const now = new Date();
    switch (period) {
        case 'today': return { start: startOfDay(now), end: endOfDay(now) };
        case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
        case 'month': return { start: startOfMonth(now), end: now };
        case 'year': return { start: startOfYear(now), end: now };
        default: return { start: startOfDay(now), end: endOfDay(now) };
    }
}

function isInRange(dateString, range) {
    try { return isWithinInterval(new Date(dateString), range); } catch { return false; }
}