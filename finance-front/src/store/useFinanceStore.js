import { create } from 'zustand';
import { toast } from '../components/ui/Toast';
import api from '../api/axios'; // Твой настроенный axios instance
import i18n from '../i18n';

// Slices
import { createUserSlice } from './slices/userSlice';
import { createAccountSlice } from './slices/accountSlice';
import { createTransactionSlice } from './slices/transactionSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createInsightsSlice } from './slices/insightsSlice';
import { createUiSlice } from './slices/uiSlice';
import { createAiSlice } from './slices/aiSlice';
import { createDebtRequestSlice } from './slices/debtRequestSlice';

export const useFinanceStore = create((set, get) => ({
  ...createUserSlice(set, get),
  ...createAccountSlice(set, get),
  ...createTransactionSlice(set, get),
  ...createFinanceSlice(set, get),
  ...createInsightsSlice(set, get),
  ...createAiSlice(set, get),
  ...createUiSlice(set, get),
  ...createDebtRequestSlice(set, get),

  analyticsSummary: null,
  topExpenses: [],
  isAnalyticsSummaryLoading: false,

  fetchAnalyticsSummary: async () => {
    set({ isAnalyticsSummaryLoading: true });
    try {
      const { data } = await api.get('/analytics/summary');
      set({ analyticsSummary: data });
    } catch (err) {
      console.error('Fetch Analytics Summary Error:', err);
    } finally {
      set({ isAnalyticsSummaryLoading: false });
    }
  },

  updateSettings: async (updates) => {
    try {
      const { data } = await api.put('/settings', updates);
      set({ settings: data });
      return true;
    } catch (e) { console.error(e); return false; }
  },

  refreshCurrencyRates: async () => {
    try {
      const { data } = await api.post('/settings/refresh-rates');
      if (data.success && data.rates) {
        set(state => ({
          settings: {
            ...state.settings,
            currency_rates: data.rates,
            updated_at: new Date().toISOString()
          }
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // ==================================================
  // ORCHESTRATOR ACTIONS
  // ==================================================

  // 1. Авторизация через API
  login: async (email, password) => {
    try {
      set({ loading: true });
      const { data } = await api.post('/auth/login', { email, password });

      // Сохраняем токен
      localStorage.setItem('token', data.token);

      // Сохраняем юзера в стейт
      set({ user: data.user });

      // Сразу подгружаем данные
      await get().fetchData();

      return true;
    } catch (e) {
      console.error("Login Error:", e);
      // toast.error обрабатывается в компоненте или интерсепторе
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // 2. Загрузка ВСЕХ данных через API (Bootstrap)
  fetchData: async () => {
    set({ loading: true });
    try {
      // Используем оптимизированный эндпоинт одной загрузки
      const { data } = await api.get('/data/bootstrap');

      set({
        accounts: data.accounts || [],
        recentTransactions: data.recentTransactions || [],
        categories: data.categories || [],
        budgets: data.budgets || [],
        debts: data.debts || [],
        goals: data.goals || [],
        recurring: data.recurring || [],
        settings: data.settings || get().settings,
        notifications: data.notifications || [],
        counterparties: data.counterparties || [],
        topExpenses: data.topExpenses || [],
        unreadNotifications: (data.notifications || []).filter(n => !n.is_read).length
      });

      await get().fetchAnalyticsSummary();

    } catch (err) {
      console.error('Fetch Data Error:', err);
      toast.error(i18n.t('toasts.load_error'));
    } finally {
      set({ loading: false });
    }
  },

  // 3. Импорт данных (Логика перенесена на Бэкенд)
  importData: async (jsonData) => {
    const user = get().user;
    if (!user) return { success: false, error: 'User not logged in' };

    try {
      set({ loading: true });

      // Отправляем JSON на сервер, пусть Prisma разбирается с типами и связями
      // Эндпоинт: POST /api/data/import
      const { data } = await api.post('/data/import', jsonData);

      if (data.success) {
        // Если успешно, обновляем данные на клиенте
        await get().fetchData();
        return { success: true };
      } else {
        throw new Error(data.error || 'Unknown import error');
      }

    } catch (e) {
      console.error('Import Error:', e);
      const errorMsg = e.response?.data?.error || e.message;
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // 4. Экспорт (Остается на клиенте, так как данные уже в стейте)
  exportDataToExcel: async () => {
    const { transactions, accounts, debts, categories, counterparties } = get();
    try {
      const XLSX = await import('xlsx');
      const txSheet = XLSX.utils.json_to_sheet(transactions);
      const accSheet = XLSX.utils.json_to_sheet(accounts);
      const debtSheet = XLSX.utils.json_to_sheet(debts);
      const catSheet = XLSX.utils.json_to_sheet(categories);
      // Если counterparties нет в стейте, добавь fetch в fetchData или используй пустой массив
      const cpSheet = XLSX.utils.json_to_sheet(counterparties || []);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, txSheet, "Transactions");
      XLSX.utils.book_append_sheet(wb, accSheet, "Accounts");
      XLSX.utils.book_append_sheet(wb, debtSheet, "Debts");
      XLSX.utils.book_append_sheet(wb, catSheet, "Categories");
      XLSX.utils.book_append_sheet(wb, cpSheet, "Counterparties");

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Finance_Backup_${dateStr}.xlsx`);
      toast.success(i18n.t('toasts.export_success'));
      return true;
    } catch (e) {
      console.error("Export Error:", e);
      toast.error(i18n.t('toasts.export_error'));
      return false;
    }
  }
}));
