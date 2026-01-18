import api from '../../api/axios';
import { toast } from '../../components/ui/Toast';

export const createDebtRequestSlice = (set, get) => ({
    // State
    incomingDebtRequests: [],
    outgoingDebtRequests: [],
    isDebtRequestsLoading: false,

    // Fetch all requests
    fetchDebtRequests: async () => {
        set({ isDebtRequestsLoading: true });
        try {
            const [incoming, outgoing] = await Promise.all([
                api.get('/debt-requests/incoming'),
                api.get('/debt-requests/outgoing')
            ]);
            set({
                incomingDebtRequests: incoming.data,
                outgoingDebtRequests: outgoing.data
            });
        } catch (err) {
            console.error('Fetch debt requests error:', err);
            toast.error('Failed to load debt requests');
        } finally {
            set({ isDebtRequestsLoading: false });
        }
    },

    // Create request
    createDebtRequest: async (requestData) => {
        try {
            const { data } = await api.post('/debt-requests', requestData);
            toast.success('Debt request sent!');
            await get().fetchDebtRequests();
            return { success: true, data };
        } catch (err) {
            console.error('Create debt request error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to send request';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    },

    // Accept request
    acceptDebtRequest: async (requestId) => {
        try {
            await api.post(`/debt-requests/${requestId}/accept`);
            toast.success('Debt accepted! Check your debts.');
            // Reload debts and requests
            await Promise.all([
                get().fetchDebtRequests(),
                get().fetchData() // Reload all data to get new debts
            ]);
            return { success: true };
        } catch (err) {
            console.error('Accept debt request error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to accept request';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    },

    // Reject request
    rejectDebtRequest: async (requestId, reason) => {
        try {
            await api.post(`/debt-requests/${requestId}/reject`, { reason });
            toast.success('Request rejected');
            await get().fetchDebtRequests();
            return { success: true };
        } catch (err) {
            console.error('Reject debt request error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to reject request';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    },

    // Cancel request
    cancelDebtRequest: async (requestId) => {
        try {
            await api.delete(`/debt-requests/${requestId}`);
            toast.success('Request cancelled');
            await get().fetchDebtRequests();
            return { success: true };
        } catch (err) {
            console.error('Cancel debt request error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to cancel request';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    },

    // Get activity
    getLinkedDebtActivity: async (linkedDebtId) => {
        try {
            const { data } = await api.get(`/linked-debts/${linkedDebtId}/activity`);
            return { success: true, data };
        } catch (err) {
            console.error('Get linked debt activity error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to load activity';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    }
});
