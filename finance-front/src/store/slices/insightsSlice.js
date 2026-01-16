import api from '../../api/axios';

export const createInsightsSlice = (set) => ({
    insightsData: null,
    isInsightsLoading: false,

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
});