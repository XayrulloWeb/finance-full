import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useTranslation } from 'react-i18next';
import { CheckCircle, DollarSign, FileText, Link, Clock, ArrowRight, Activity } from 'lucide-react';
import api from '../../api/axios';
import { useFinanceStore } from '../../store/useFinanceStore';

export default function DebtDetailsModal({ isOpen, onClose, debt }) {
    const { t, i18n } = useTranslation();
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const transactions = useFinanceStore(s => s.transactions);

    useEffect(() => {
        if (isOpen && debt?.is_linked && debt?.linked_debt_id) {
            fetchActivities();
        } else {
            setActivities([]);
        }
    }, [isOpen, debt]);

    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/linked-debts/${debt.linked_debt_id}/activity`);
            setActivities(res.data);
        } catch (error) {
            console.error('Failed to fetch debt activities', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter related local transactions
    const relatedTransactions = transactions.filter(tx =>
        tx.comment && debt?.name && tx.comment.includes(debt.name)
    );

    if (!debt) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('debts.history_title') || 'History'}>
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-xl border border-zinc-100 dark:border-white/5">
                    <div className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('debts.name') || 'Name'}</div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        {debt.name}
                        {debt.is_linked && <Link size={18} className="text-blue-500" />}
                    </div>
                    <div className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">{t('debts.amount') || 'Amount'}</div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(debt.amount)} <span className="text-sm text-zinc-400 dark:text-zinc-600 font-bold">UZS</span>
                    </div>
                </div>

                {/* Audit Trail / Timeline */}
                {debt.is_linked && (
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity size={16} /> {t('debts.audit_trail', 'Activity Log')}
                        </h3>

                        {isLoading ? (
                            <div className="text-center py-4 text-zinc-400">{t('common.loading')}</div>
                        ) : activities.length > 0 ? (
                            <div className="relative border-l-2 border-zinc-100 dark:border-white/5 pl-6 ml-3 space-y-6">
                                {activities.map((act, idx) => (
                                    <div key={act.id || idx} className="relative">
                                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${act.action_type === 'created' ? 'bg-indigo-500' :
                                            act.action_type === 'payment' ? 'bg-emerald-500' :
                                                act.action_type === 'settled' ? 'bg-blue-500' : 'bg-zinc-400'
                                            }`} />

                                        <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-0.5">
                                            {formatDate(act.created_at)}
                                        </div>
                                        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                            {act.user?.email || 'User'}
                                        </div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 bg-zinc-50 dark:bg-white/5 p-2 rounded-lg inline-block border border-zinc-100 dark:border-white/5">
                                            {act.note || act.action_type}
                                            {act.amount > 0 && (
                                                <span className="font-bold ml-1 text-zinc-900 dark:text-zinc-200">
                                                    {formatCurrency(act.amount)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-zinc-400 text-sm italic">No activity recorded.</div>
                        )}
                    </div>
                )}

                {/* Local Transactions History */}
                {!debt.is_linked && relatedTransactions.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText size={16} /> {t('debts.local_history', 'Local Transactions')}
                        </h3>
                        <div className="space-y-2">
                            {relatedTransactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-zinc-100 dark:border-white/5 rounded-xl">
                                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{formatDate(tx.date)}</div>
                                    <div className={`font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
