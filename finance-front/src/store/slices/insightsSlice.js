import api from '../../api/axios';
import i18n from '../../i18n';

export const createInsightsSlice = (set) => ({
    insightsData: null,
    isInsightsLoading: false,
    aiInsight: null,
    isAiInsightLoading: false,

    fetchInsights: async () => {
        set({ isInsightsLoading: true });
        try {
            const { data } = await api.get('/insights');
            set({ insightsData: data, isInsightsLoading: false });
        } catch (e) {
            console.error('Failed to fetch insights:', e);
            set({ isInsightsLoading: false });
        }
    },
    fetchAiInsight: async () => {
        set({ isAiInsightLoading: true });
        try {
            const { data } = await api.get('/insights/smart', {
                params: { lang: i18n.language || 'ru' }
            });
            set({ aiInsight: data, isAiInsightLoading: false });
        } catch (e) {
            console.error('Failed to fetch AI insight:', e);
            set({ isAiInsightLoading: false });
        }
    },
});
