import api from '../../api/axios';
import { toast } from '../../components/ui/Toast';
import i18n from '../../i18n';

function getRandomColor() {
    const colors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#ec4899', '#8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

export const createAccountSlice = (set, get) => ({
    accounts: [],
    categories: [],
    counterparties: [],

    // --- ACCOUNTS ---
    createAccount: async (name, currency = 'UZS', color, icon = '💳', initialBalance = 0) => {
        try {
            const { data } = await api.post('/accounts', {
                name, currency, color, icon, initialBalance
            });

            if (data) {
                // Если был начальный баланс, данные на сервере обновились
                // Лучше перезапросить весь дашборд, чтобы балансы синхронизировались
                get().fetchData();

                // Или просто добавить в список (если баланс 0)
                // set(state => ({ accounts: [...state.accounts, data] })); // Но data может быть result транзакции

                toast.success(i18n.t('toasts.acc_created'));
                return true;
            }
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.acc_create_error'));
            return false;
        }
    },
    updateAccount: async (id, updates) => {
        try {
            const { data } = await api.put(`/accounts/${id}`, updates);
            set(state => ({ accounts: state.accounts.map(a => a.id === id ? data : a) }));
            toast.success(i18n.t('toasts.acc_updated'));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.update_error'));
        }
    },

    deleteAccount: async (id) => {
        try {
            await api.delete(`/accounts/${id}`);
            set(state => ({ accounts: state.accounts.filter(a => a.id !== id) }));
            toast.success(i18n.t('toasts.acc_deleted'));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.delete_error'));
        }
    },

    getAccountBalance: (id) => {
        const account = get().accounts.find(a => a.id === id);
        // В новой схеме баланс приходит прямо в объекте account
        return account ? Number(account.balance) : 0;
    },

    // Эта функция теперь часть fetchData, но можно оставить для отдельного вызова
    fetchAccounts: async () => {
        try {
            const { data } = await api.get('/dashboard');
            if (data.accounts) set({ accounts: data.accounts });
        } catch (e) { console.error(e); }
    },

    // --- CATEGORIES ---
    fetchCategories: async () => {
        try {
            const { data } = await api.get('/categories');
            set({ categories: data });
        } catch (e) { console.error(e); }
    },

    createCategory: async (name, type, icon = '📌', color) => {
        try {
            const { data } = await api.post('/categories', { name, type, icon, color });
            set(state => ({ categories: [...state.categories, data] }));
            toast.success(i18n.t('toasts.cat_created'));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.cat_create_error'));
        }
    },

    deleteCategory: async (id) => {
        try {
            await api.delete(`/categories/${id}`);
            set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
            toast.success(i18n.t('toasts.cat_deleted'));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.cat_delete_error'));
        }
    },

    // --- COUNTERPARTIES ---
    fetchCounterparties: async () => {
        try {
            const { data } = await api.get('/counterparties');
            set({ counterparties: data });
        } catch (e) { console.error(e); }
    },

    createCounterparty: async (form) => {
        try {
            const { data } = await api.post('/counterparties', form);
            set(state => ({ counterparties: [...state.counterparties, data] }));
            toast.success(i18n.t('toasts.cp_created'));
        } catch (e) {
            console.error(e);
            toast.error(i18n.t('toasts.cp_create_error'));
        }
    },

    updateCounterparty: async (id, updates) => {
        try {
            const { data } = await api.put(`/counterparties/${id}`, updates);
            set(state => ({ counterparties: state.counterparties.map(c => c.id === id ? data : c) }));
        } catch (e) { console.error(e); }
    },

    deleteCounterparty: async (id) => {
        try {
            await api.delete(`/counterparties/${id}`);
            set(state => ({ counterparties: state.counterparties.filter(c => c.id !== id) }));
            toast.success(i18n.t('toasts.cp_deleted'));
        } catch (e) { console.error(e); }
    },

    toggleFavorite: async (id) => {
        try {
            const { data } = await api.post(`/counterparties/${id}/favorite`);
            set(state => ({
                counterparties: state.counterparties.map(c => c.id === id ? data : c)
            }));
        } catch (e) { console.error(e); }
    },

    getCounterpartyStats: (id) => {
        const { transactions } = get();
        const txs = transactions.filter(t => t.counterparty_id === id);
        const totalIncome = txs.filter(t => t.type === 'income' || t.type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = txs.filter(t => t.type === 'expense' || t.type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0);
        return { transactionCount: txs.length, totalIncome, totalExpense };
    },

    // Helpers
    getTotalBalanceInBaseCurrency: () => {
        const { accounts, settings, convertCurrency } = get();
        const base = settings.base_currency;
        return accounts.reduce((total, acc) => {
            const balance = Number(acc.balance);
            return total + convertCurrency(balance, acc.currency, base);
        }, 0);
    },

    convertCurrency: (amount, fromCurrency, toCurrency) => {
        const { settings } = get();
        const rates = settings.currency_rates;
        if (!amount) return 0;
        if (fromCurrency === toCurrency) return amount;

        // Простая конвертация через UZS (базовую валюту)
        // Rate: сколько сумов стоит 1 единица валюты
        const rateFrom = rates[fromCurrency] || 1;
        const rateTo = rates[toCurrency] || 1;

        // Пример: 100 USD -> UZS -> EUR
        // 100 * 12850 = 1285000 UZS
        // 1285000 / 13500 = 95.18 EUR
        return (amount * rateFrom) / rateTo;
    },
});