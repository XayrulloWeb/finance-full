import React from 'react';
import { Check, X, Clock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import ConfirmDialog from './ui/ConfirmDialog';

export default function DebtRequestCard({ request, type = 'incoming' }) {
    const { t } = useTranslation();
    const acceptDebtRequest = useFinanceStore(s => s.acceptDebtRequest);
    const rejectDebtRequest = useFinanceStore(s => s.rejectDebtRequest);
    const cancelDebtRequest = useFinanceStore(s => s.cancelDebtRequest);

    const [loading, setLoading] = React.useState(false);
    const [showRejectReason, setShowRejectReason] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState('');

    const [showConfirm, setShowConfirm] = React.useState(false);

    const handleAccept = async () => {
        setLoading(true);
        await acceptDebtRequest(request.id);
        setLoading(false);
    };

    const handleReject = async () => {
        setLoading(true);
        await rejectDebtRequest(request.id, rejectReason);
        setLoading(false);
        setShowRejectReason(false);
    };

    const handleCancelClick = () => {
        setShowConfirm(true);
    };

    const executeCancel = async () => {
        setLoading(true);
        await cancelDebtRequest(request.id);
        setLoading(false);
        setShowConfirm(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">{t('debt_requests.pending', 'Pending')}</span>,
            accepted: <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">{t('debt_requests.accepted', 'Accepted')}</span>,
            rejected: <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">{t('debt_requests.rejected', 'Rejected')}</span>,
            cancelled: <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{t('debt_requests.cancelled', 'Cancelled')}</span>,
        };
        return badges[status] || null;
    };

    // Incoming request card
    if (type === 'incoming') {
        return (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/5 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">💰</span>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {request.sender?.email || 'Unknown'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-zinc-400">
                            {t('debt_requests.says_you_owe', 'says you')}{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {request.debt_type === 'owes_me' ? 'owe' : 'lent'} {request.amount.toLocaleString()}
                            </span>{' '}
                            for <span className="font-semibold text-gray-900 dark:text-white">{request.name}</span>
                        </p>
                    </div>
                    {getStatusBadge(request.status)}
                </div>

                {request.notes && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-zinc-300">{request.notes}</p>
                    </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-500 mb-4">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(request.created_at)}
                    </span>
                    {request.due_date && (
                        <span>• Due: {formatDate(request.due_date)}</span>
                    )}
                </div>

                {request.status === 'pending' && !showRejectReason && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                            <Check className="w-4 h-4" />
                            {t('debt_requests.accept', 'Accept')}
                        </button>
                        <button
                            onClick={() => setShowRejectReason(true)}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                            <X className="w-4 h-4" />
                            {t('debt_requests.reject', 'Reject')}
                        </button>
                    </div>
                )}

                {showRejectReason && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={t('debt_requests.rejection_reason', 'Reason (optional)')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-black/20 dark:text-white rounded-lg text-sm outline-none focus:border-indigo-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Confirm Reject
                            </button>
                            <button
                                onClick={() => setShowRejectReason(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-white/10 dark:text-zinc-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Outgoing request card
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/5 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">📤</span>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                            {t('debt_requests.you_sent_to', 'Request to')} {request.receiver?.email || request.receiver_email}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        <span className="font-semibold text-gray-900 dark:text-white">{request.amount.toLocaleString()}</span>{' '}
                        for <span className="font-semibold text-gray-900 dark:text-white">{request.name}</span>
                    </p>
                </div>
                {getStatusBadge(request.status)}
            </div>

            {request.notes && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-zinc-300">{request.notes}</p>
                </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-500 mb-3">
                <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(request.created_at)}
                </span>
                {request.responded_at && (
                    <span>• Responded: {formatDate(request.responded_at)}</span>
                )}
            </div>

            {request.status === 'rejected' && request.rejection_reason && (
                <div className="p-3 bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 rounded-lg mb-3">
                    <p className="text-sm text-red-800 dark:text-rose-400">
                        <strong>Reason:</strong> {request.rejection_reason}
                    </p>
                </div>
            )}

            {request.status === 'pending' ? (
                <button
                    onClick={handleCancelClick}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                    <Trash2 className="w-4 h-4" />
                    {t('common.cancel', 'Cancel Request')}
                </button>
            ) : (
                <button
                    onClick={handleCancelClick}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-zinc-500 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 hover:text-red-500 dark:hover:text-rose-500 hover:border-red-200 dark:hover:border-rose-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-xs"
                >
                    <Trash2 className="w-3 h-3" />
                    {t('common.delete_history', 'Delete from History')}
                </button>
            )}

            <ConfirmDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeCancel}
                title={request.status === 'pending' ? t('common.cancel_request', 'Cancel Request?') : t('common.delete_history', 'Delete from History?')}
                message={request.status === 'pending'
                    ? t('common.cancel_confirm', 'Are you sure you want to cancel this request? The receiver will no longer see it.')
                    : t('common.delete_history_confirm', 'This will remove the request from your history. The other party will still see it.')}
                confirmText={request.status === 'pending' ? t('common.yes_cancel', 'Yes, Cancel') : t('common.delete', 'Delete')}
                type="danger"
                isLoading={loading}
            />
        </div>
    );
}
