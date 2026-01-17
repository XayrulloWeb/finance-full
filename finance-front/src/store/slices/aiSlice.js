import api from '../../api/axios';
import i18n from '../../i18n';

const withLang = () => ({ params: { lang: i18n.language || 'ru' } });

export const createAiSlice = (set, get) => ({
    aiAlerts: [],
    aiForecast: null,
    aiAnalyticsExplanation: null,
    aiGoalsAdvice: null,
    aiDebtsAdvice: null,
    aiCategorySuggestions: [],
    aiForecastAttemptAt: null,
    aiForecastFetchedAt: null,
    aiAlertsAttemptAt: null,
    aiAlertsFetchedAt: null,
    aiCategoriesAttemptAt: null,
    aiCategoriesFetchedAt: null,
    aiForecastErrorAt: null,
    isAiAlertsLoading: false,
    isAiForecastLoading: false,
    isAiAnalyticsLoading: false,
    isAiGoalsLoading: false,
    isAiDebtsLoading: false,
    isAiCategoriesLoading: false,

    fetchAiAlerts: async () => {
        const now = Date.now();
        const { aiAlerts, aiAlertsAttemptAt, aiAlertsFetchedAt } = get();
        if (aiAlerts && aiAlerts.length > 0 && aiAlertsFetchedAt && now - aiAlertsFetchedAt < 300000) {
            return;
        }
        if (aiAlertsAttemptAt && now - aiAlertsAttemptAt < 30000) {
            return;
        }
        set({ isAiAlertsLoading: true, aiAlertsAttemptAt: now });
        try {
            const { data } = await api.get('/ai/alerts', withLang());
            set({
                aiAlerts: data.alerts || [],
                isAiAlertsLoading: false,
                aiAlertsFetchedAt: now
            });
        } catch (error) {
            console.error('AI Alerts Error:', error);
            set({ isAiAlertsLoading: false });
        }
    },

    fetchAiForecast: async () => {
        const now = Date.now();
        const { aiForecast, aiForecastAttemptAt, aiForecastFetchedAt } = get();
        if (aiForecast && aiForecastFetchedAt && now - aiForecastFetchedAt < 300000) {
            return;
        }
        if (aiForecastAttemptAt && now - aiForecastAttemptAt < 30000) {
            return;
        }
        set({ isAiForecastLoading: true, aiForecastAttemptAt: now });
        try {
            const { data } = await api.get('/ai/forecast', withLang());
            set({
                aiForecast: data,
                isAiForecastLoading: false,
                aiForecastErrorAt: null,
                aiForecastFetchedAt: now
            });
        } catch (error) {
            console.error('AI Forecast Error:', error);
            set({
                isAiForecastLoading: false,
                aiForecastErrorAt: Date.now()
            });
        }
    },

    fetchAiAnalyticsExplanation: async () => {
        set({ isAiAnalyticsLoading: true });
        try {
            const { data } = await api.get('/ai/analytics-explain', withLang());
            set({ aiAnalyticsExplanation: data, isAiAnalyticsLoading: false });
        } catch (error) {
            console.error('AI Analytics Explanation Error:', error);
            set({ isAiAnalyticsLoading: false });
        }
    },

    fetchAiGoalsAdvice: async () => {
        set({ isAiGoalsLoading: true });
        try {
            const { data } = await api.get('/ai/goals-advice', withLang());
            set({ aiGoalsAdvice: data, isAiGoalsLoading: false });
        } catch (error) {
            console.error('AI Goals Advice Error:', error);
            set({ isAiGoalsLoading: false });
        }
    },

    fetchAiDebtsAdvice: async () => {
        set({ isAiDebtsLoading: true });
        try {
            const { data } = await api.get('/ai/debts-advice', withLang());
            set({ aiDebtsAdvice: data, isAiDebtsLoading: false });
        } catch (error) {
            console.error('AI Debts Advice Error:', error);
            set({ isAiDebtsLoading: false });
        }
    },

    fetchAiCategorySuggestions: async () => {
        const now = Date.now();
        const { aiCategorySuggestions, aiCategoriesAttemptAt, aiCategoriesFetchedAt } = get();
        if (aiCategorySuggestions && aiCategorySuggestions.length > 0 && aiCategoriesFetchedAt && now - aiCategoriesFetchedAt < 300000) {
            return;
        }
        if (aiCategoriesAttemptAt && now - aiCategoriesAttemptAt < 30000) {
            return;
        }
        set({ isAiCategoriesLoading: true, aiCategoriesAttemptAt: now });
        try {
            const { data } = await api.get('/ai/categories/suggest', withLang());
            set({
                aiCategorySuggestions: data.suggestions || [],
                isAiCategoriesLoading: false,
                aiCategoriesFetchedAt: now
            });
        } catch (error) {
            console.error('AI Category Suggestions Error:', error);
            set({ isAiCategoriesLoading: false });
        }
    },
});
