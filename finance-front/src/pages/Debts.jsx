import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Plus, Trash2, CheckCircle, ArrowUpRight, ArrowDownLeft, Calendar, User, Wallet, Users, Link } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import DebtRequestModal from '../components/modals/DebtRequestModal';
import DebtRequestCard from '../components/DebtRequestCard';
import DebtDetailsModal from '../components/modals/DebtDetailsModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Debts() {
    const { t, i18n } = useTranslation();
    const { debts, addDebt, payDebt, deleteDebt, accounts } = useFinanceStore();
    const fetchAiDebtsAdvice = useFinanceStore(s => s.fetchAiDebtsAdvice);
    const aiDebtsAdvice = useFinanceStore(s => s.aiDebtsAdvice);
    const isAiDebtsLoading = useFinanceStore(s => s.isAiDebtsLoading);

    // Debt Requests
    const fetchDebtRequests = useFinanceStore(s => s.fetchDebtRequests);
    const incomingDebtRequests = useFinanceStore(s => s.incomingDebtRequests);
    const outgoingDebtRequests = useFinanceStore(s => s.outgoingDebtRequests);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDebtRequestModalOpen, setIsDebtRequestModalOpen] = useState(false);
    const [payModalDebt, setPayModalDebt] = useState(null);
    const [viewHistoryDebt, setViewHistoryDebt] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [payAccountId, setPayAccountId] = useState(accounts?.[0]?.id || '');

    // Confirm Dialog State
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    const openConfirm = (title, message, onConfirm, type = 'danger') => {
        setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
    };

    const closeConfirm = () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    };

    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

    useEffect(() => {
        if (!aiDebtsAdvice && !isAiDebtsLoading) {
            fetchAiDebtsAdvice();
        }
        fetchDebtRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [form, setForm] = useState({ name: '', amount: '', type: 'i_owe', due_date: '', contact_phone: '' });

    const handleCreate = async () => {
        if (!form.name || !form.amount) return;

        await addDebt(form);
        setIsCreateModalOpen(false);
        setForm({ name: '', amount: '', type: 'i_owe', due_date: '', contact_phone: '' });
        toast.success(t('debts.toast_added'));
    };

    const handlePay = async () => {
        if (!payAmount || !payModalDebt) return;
        await payDebt(payModalDebt.id, payAmount, payAccountId);
        setPayModalDebt(null);
        setPayAmount('');
        // toast handles in store
    };

    const handleDelete = async (id) => {
        openConfirm(
            t('debts.confirm_delete_title', 'Delete Debt?'),
            t('debts.confirm_delete'),
            async () => {
                await deleteDebt(id);
                toast.success(t('debts.toast_deleted'));
            }
        );
    };

    // Helper for currency formatting based on current language
    const formatCurrency = (val) => {
        return new Intl.NumberFormat(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Force DD.MM.YYYY format to avoid locale weirdness like "2026 M01 31"
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // FILTER DEBTS
    const displayedDebts = debts.filter(d => {
        if (activeTab === 'active') return !d.is_closed;
        if (activeTab === 'history') return d.is_closed;
        return true;
    });

    const totalIOwe = debts.filter(d => !d.is_closed && d.type === 'i_owe').reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);
    const totalOwesMe = debts.filter(d => !d.is_closed && d.type === 'owes_me').reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in custom-scrollbar pb-28 sm:pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                        <span className="p-2 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl"><Wallet strokeWidth={2.5} /></span>
                        {t('debts.title')}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t('debts.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsDebtRequestModalOpen(true)} icon={Users} variant="secondary">
                        {t('debt_requests.send_to_friend', 'Send to Friend')}
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>{t('debts.new_record')}</Button>
                </div>
            </div>

            {/* AI Advice */}
            {isAiDebtsLoading && !aiDebtsAdvice ? (
                <SkeletonLoader type="card" count={1} />
            ) : aiDebtsAdvice?.message ? (
                <GlassCard className="relative overflow-hidden">
                    <div className="text-xs font-bold uppercase text-zinc-400 mb-2">{t('ai.debts_advice.title')}</div>
                    <div className="text-sm font-semibold text-zinc-700">{aiDebtsAdvice.message}</div>
                </GlassCard>
            ) : null}

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-transparent border-rose-100 dark:border-rose-500/20 shadow-sm">
                    <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-bold mb-2">
                        <ArrowDownLeft size={20} strokeWidth={2.5} /> {t('debts.i_owe')}
                    </div>
                    <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {formatCurrency(totalIOwe)} <span className="text-lg opacity-50 font-medium">UZS</span>
                    </div>
                </GlassCard>

                <GlassCard className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-transparent border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-2">
                        <ArrowUpRight size={20} strokeWidth={2.5} /> {t('debts.owes_me')}
                    </div>
                    <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {formatCurrency(totalOwesMe)} <span className="text-lg opacity-50 font-medium">UZS</span>
                    </div>
                </GlassCard>
            </div>

            {/* PENDING DEBT REQUESTS */}
            {(incomingDebtRequests?.length > 0 || outgoingDebtRequests?.length > 0) && (
                <>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                        <Users size={20} className="text-violet-600 dark:text-violet-400" strokeWidth={2.5} />
                        {t('debt_requests.title', 'Debt Requests')}
                        {incomingDebtRequests?.length > 0 && (
                            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-full">
                                {incomingDebtRequests.length}
                            </span>
                        )}
                    </h2>

                    <div className="space-y-4">
                        {incomingDebtRequests?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-500 mb-3 uppercase">
                                    {t('debt_requests.incoming', 'Incoming')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {incomingDebtRequests.map(req => (
                                        <DebtRequestCard key={req.id} request={req} type="incoming" />
                                    ))}
                                </div>
                            </div>
                        )}

                        {outgoingDebtRequests?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-500 mb-3 uppercase">
                                    {t('debt_requests.outgoing', 'Outgoing')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {outgoingDebtRequests.map(req => (
                                        <DebtRequestCard key={req.id} request={req} type="outgoing" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TABS & DEBTS LIST */}
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'active' ? 'bg-zinc-900 dark:bg-violet-600 text-white shadow-lg shadow-zinc-900/20 dark:shadow-violet-600/30' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                >
                    {t('debts.tab_active')}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-zinc-900 dark:bg-violet-600 text-white shadow-lg shadow-zinc-900/20 dark:shadow-violet-600/30' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                >
                    {t('debts.tab_history')}
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <AnimatePresence mode='popLayout'>
                    {displayedDebts.map(debt => {
                        const remaining = debt.amount - debt.paid_amount;
                        const percent = (debt.paid_amount / debt.amount) * 100;
                        const isIOwe = debt.type === 'i_owe';

                        return (
                            <motion.div
                                key={debt.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                            >
                                <GlassCard className="relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {/* Direction Icon */}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm border ${isIOwe ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} `}>
                                                {isIOwe ? <ArrowDownLeft size={24} strokeWidth={2.5} /> : <ArrowUpRight size={24} strokeWidth={2.5} />}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-lg text-zinc-900 leading-tight flex items-center gap-1">
                                                        {debt.name}
                                                        {debt.is_linked && (
                                                            <Link
                                                                size={16}
                                                                className="text-blue-500"
                                                                strokeWidth={2.5}
                                                                title={t('debts.linked_tooltip', 'Connected with friend')}
                                                            />
                                                        )}
                                                    </div>
                                                    {/* Explicit Badge */}
                                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${isIOwe ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {isIOwe ? t('debts.i_owe') : t('debts.owes_me')}
                                                    </span>
                                                </div>

                                                {/* Partner Info */}
                                                {(debt.linked_debt_a?.user_b || debt.linked_debt_b?.user_a) && (
                                                    <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1 mt-0.5">
                                                        <Users size={12} strokeWidth={2.5} />
                                                        {(debt.linked_debt_a?.user_b || debt.linked_debt_b?.user_a).email}
                                                    </div>
                                                )}

                                                <div className="text-xs font-medium text-zinc-400 flex items-center gap-2 mt-1">
                                                    {debt.due_date && (
                                                        <span className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-md text-zinc-600">
                                                            <Calendar size={12} strokeWidth={2.5} /> {formatDate(debt.due_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={`font-black text-xl ${isIOwe ? 'text-rose-500' : 'text-emerald-600'} `}>
                                                {formatCurrency(remaining)}
                                            </div>
                                            <div className="text-xs text-zinc-400 font-bold">
                                                {t('debts.of')} {formatCurrency(debt.amount)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-zinc-100 rounded-full mb-4 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}% ` }}
                                            className={`h-full ${isIOwe ? 'bg-rose-500' : 'bg-emerald-500'} `}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <button
                                            onClick={() => setViewHistoryDebt(debt)}
                                            className="p-2 bg-zinc-100 rounded-lg text-zinc-400 hover:text-indigo-600"
                                            title={t('debts.history_title')}
                                        >
                                            <Calendar size={18} strokeWidth={2.5} />
                                        </button>

                                        {!debt.is_closed && (
                                            <Button size="sm" onClick={() => setPayModalDebt(debt)} className="flex-1">
                                                {isIOwe ? t('debts.pay') : t('debts.record_receipt')}
                                            </Button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(debt.id)}
                                            className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                                        >
                                            <Trash2 size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {displayedDebts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl">
                        <CheckCircle size={48} className="mx-auto mb-4 opacity-20" strokeWidth={1} />
                        <p>{t('debts.empty')}</p>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('debts.create_title')}>
                <div className="space-y-4">
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-white/5">
                        <button
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.type === 'i_owe' ? 'bg-white dark:bg-slate-700 shadow text-rose-500 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'} `}
                            onClick={() => setForm({ ...form, type: 'i_owe' })}
                        >
                            {t('debts.type_i_owe')}
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.type === 'owes_me' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'} `}
                            onClick={() => setForm({ ...form, type: 'owes_me' })}
                        >
                            {t('debts.type_owes_me')}
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('debts.name_label')}</label>
                        <input
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white focus:border-indigo-500 shadow-sm transition-colors"
                            placeholder={t('debts.name_placeholder')}
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('debts.amount_label')}</label>
                        <input
                            type="number"
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-xl text-zinc-900 dark:text-white focus:border-indigo-500 shadow-sm transition-colors"
                            placeholder="0"
                            value={form.amount}
                            onChange={e => setForm({ ...form, amount: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('debts.date_label')}</label>
                        <input
                            type="date"
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white focus:border-indigo-500 shadow-sm transition-colors"
                            value={form.due_date}
                            onChange={e => setForm({ ...form, due_date: e.target.value })}
                        />
                    </div>

                    <Button onClick={handleCreate} className="w-full py-4 text-lg bg-primary hover:bg-primary/90">{t('debts.create_btn')}</Button>
                </div>
            </Modal>

            {/* PAY MODAL */}
            <Modal isOpen={!!payModalDebt} onClose={() => setPayModalDebt(null)} title={t('debts.pay_title')}>
                <div className="space-y-4">
                    <div className="text-center mb-4">
                        <div className="text-zinc-500 dark:text-zinc-400 text-sm">{t('debts.remaining_debt')}</div>
                        <div className="text-2xl font-black text-zinc-900 dark:text-white">
                            {payModalDebt && formatCurrency(payModalDebt.amount - payModalDebt.paid_amount)} UZS
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('debts.pay_amount_label')}</label>
                        <input
                            type="number"
                            autoFocus
                            placeholder={t('debts.pay_amount_placeholder')}
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-center text-xl text-zinc-900 dark:text-white focus:border-emerald-500 shadow-sm transition-colors"
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('debts.account_label')}</label>
                        <select
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white shadow-sm transition-colors"
                            onChange={(e) => setPayAccountId(e.target.value)}
                        >
                            {useFinanceStore(s => s.accounts).map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                            ))}
                        </select>
                    </div>

                    <Button onClick={handlePay} className="w-full py-4 bg-success hover:bg-success/90 text-slate-900">
                        {t('debts.confirm_pay')}
                    </Button>
                </div>
            </Modal >

            {/* HISTORY MODAL (Audit Trail) */}
            <DebtDetailsModal
                isOpen={!!viewHistoryDebt}
                onClose={() => setViewHistoryDebt(null)}
                debt={viewHistoryDebt}
            />

            {/* DEBT REQUEST MODAL */}
            <DebtRequestModal
                isOpen={isDebtRequestModalOpen}
                onClose={() => setIsDebtRequestModalOpen(false)}
            />

            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={() => {
                    confirmConfig.onConfirm();
                    closeConfirm();
                }}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
            />
        </div >
    );
}
