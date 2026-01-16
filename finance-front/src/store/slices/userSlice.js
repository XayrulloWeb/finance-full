import api from '../../api/axios';
import { toast } from '../../components/ui/Toast';

export const createUserSlice = (set, get) => ({
    user: null,
    isAuthChecked: false, // Флаг: проверили ли мы, залогинен юзер или нет
    loading: false,

    // Дефолтные настройки
    settings: {
        base_currency: 'UZS',
        currency_rates: { 'USD': 12850, 'EUR': 13500, 'RUB': 140 },
        dark_mode: false,
        is_privacy_enabled: false
    },
    notifications: [],
    unreadNotifications: 0,

    // --- ACTIONS ---

    // 1. Проверка при загрузке страницы (Auth Check)
    checkUser: async () => {
        // Проверяем, есть ли токен в браузере
        const token = localStorage.getItem('token');

        if (!token) {
            // Токена нет — значит мы не залогинены.
            // Ставим user: null и isAuthChecked: true, чтобы App.jsx показал экран Auth
            // И ВАЖНО: мы НЕ вызываем fetchData, чтобы не получать 401 ошибок
            set({ user: null, isAuthChecked: true });
            return;
        }

        try {
            // Токен есть! Пробуем сделать легкий запрос к API, чтобы проверить, жив ли он.
            // Запрашиваем настройки пользователя.
            const { data } = await api.get('/settings');

            // Если запрос прошел успешно (200 OK), значит токен валиден.
            set({
                // Восстанавливаем объект user.
                // Пока ставим заглушку email, так как /settings возвращает user_id.
                // В будущем можно сделать эндпоинт /auth/me
                user: {
                    id: data.user_id,
                    email: data.user_email || 'User',
                    role: data.user_role || 'user',
                    status: data.user_status || 'active'
                },
                settings: data,
                isAuthChecked: true
            });

            // Только теперь, когда мы уверены в токене, грузим остальные данные
            get().fetchData();

        } catch (error) {
            console.error("Token expired or invalid:", error);
            // Если ошибка (например, 401) — токен протух. Выкидываем юзера.
            get().logout();
        }
    },

    // 2. Логаут
    logout: () => {
        localStorage.removeItem('token'); // Удаляем токен из браузера

        // Очищаем весь стейт
        set({
            user: null,
            isAuthChecked: true,
            accounts: [],
            categories: [],
            transactions: [],
            budgets: [],
            debts: [],
            goals: [],
            notifications: [],
            analyticsSummary: null,
            isAnalyticsSummaryLoading: false
        });

        // Перенаправление на Auth произойдет автоматически в App.jsx, так как user станет null
    },

    // 3. Обновление настроек
    updateSettings: async (newSettings) => {
        try {
            const { data } = await api.put('/settings', newSettings);
            set({ settings: data });
            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false };
        }
    },

    togglePrivacy: async () => {
        const { settings } = get();
        const newState = !settings.is_privacy_enabled;
        try {
            const { data } = await api.put('/settings', { is_privacy_enabled: newState });
            set({ settings: data });
            localStorage.setItem('finance_privacy', JSON.stringify(newState));
        } catch (error) {
            console.error(error);
        }
    },

    // --- NOTIFICATIONS ---
    markNotificationRead: async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            set(state => ({
                notifications: state.notifications.map(n => n.id === id ? ({ ...n, is_read: true }) : n),
                unreadNotifications: Math.max(0, state.unreadNotifications - 1)
            }));
        } catch (error) {
            console.error(error);
        }
    },

    clearAllNotifications: async () => {
        try {
            await api.post('/notifications/read-all');
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, is_read: true })),
                unreadNotifications: 0
            }));
        } catch (error) {
            console.error(error);
        }
    },

    // Заглушка, чтобы не ломать вызовы в App.jsx
    // Теперь курсы валют хранятся на бэкенде в UserSettings
    updateCurrencyRatesIfNeeded: async () => {
        // Логика перенесена на сервер или пока не используется
    }
});
