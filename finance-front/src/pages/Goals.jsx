import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Plus, Target, Trophy, Clock, DollarSign, Trash2 } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { toast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';
export default function Goals() {
    const { t, i18n } = useTranslation();
    const { goals, addGoal, deleteGoal, addMoneyToGoal, accounts, settings } = useFinanceStore();
    const fetchAiGoalsAdvice = useFinanceStore(s => s.fetchAiGoalsAdvice);
    const aiGoalsAdvice = useFinanceStore(s => s.aiGoalsAdvice);
    const isAiGoalsLoading = useFinanceStore(s => s.isAiGoalsLoading);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [topUpGoal, setTopUpGoal] = useState(null); // Goal object to top up

    // Forms
    const [createForm, setCreateForm] = useState({ name: '', target_amount: '', deadline: '', icon: '🎯', color: '#2563eb' });
    const [topUpAmount, setTopUpAmount] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');

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

    const handleCreate = async () => {
        if (!createForm.name || !createForm.target_amount) return toast.error(t('goals.toast_fill_fields'));

        await addGoal(createForm);
        setIsCreateModalOpen(false);
        setCreateForm({ name: '', target_amount: '', deadline: '', icon: '🎯', color: '#2563eb' });
    };

    const handleTopUp = async () => {
        if (!topUpAmount || !selectedAccount || !topUpGoal) return toast.error(t('goals.toast_fill_topup'));

        await addMoneyToGoal(topUpGoal.id, topUpAmount, selectedAccount);
        setTopUpAmount('');
        setTopUpGoal(null);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        openConfirm(
            t('goals.confirm_delete_title', 'Delete Goal?'),
            t('goals.confirm_delete'),
            async () => {
                await deleteGoal(id);
            }
        );
    };

    // Helper for currency formatting based on current language
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    useEffect(() => {
        fetchAiGoalsAdvice();
    }, [fetchAiGoalsAdvice]);

    return (
        <div className="space-y-8 sm:space-y-10 animate-fade-in pb-28 sm:pb-32 custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
                        <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Target strokeWidth={2.5} /></span>
                        {t('goals.title')}
                    </h1>
                    <p className="text-zinc-500 mt-1">{t('goals.subtitle')}</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>{t('goals.new_goal')}</Button>
            </div>

            {/* AI Advice */}
            {isAiGoalsLoading && !aiGoalsAdvice ? (
                <SkeletonLoader type="card" count={1} />
            ) : aiGoalsAdvice?.message ? (
                <GlassCard className="relative overflow-hidden">
                    <div className="text-xs font-bold uppercase text-zinc-400 mb-2">{t('ai.goals_advice.title')}</div>
                    <div className="text-sm font-semibold text-zinc-700">{aiGoalsAdvice.message}</div>
                </GlassCard>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal, idx) => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                    const isCompleted = goal.current_amount >= goal.target_amount;

                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <GlassCard className="relative group min-h-[240px] flex flex-col justify-between hover:border-indigo-300 transition-all cursor-default">
                                {isCompleted && (
                                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-white p-2 rounded-full shadow-lg animate-bounce z-10">
                                        <Trophy size={20} strokeWidth={2.5} fill="currentColor" />
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-zinc-100 bg-white dark:bg-white/5 dark:border-white/10">
                                            {goal.icon}
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, goal.id)}
                                            className="text-zinc-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1">{goal.name}</h3>

                                    <div className="flex items-center gap-2 text-base text-zinc-500 dark:text-zinc-400 font-medium">
                                        {formatCurrency(goal.target_amount)} {settings.base_currency}
                                    </div>

                                    {daysLeft !== null && !isCompleted && (
                                        <div className={`mt-3 text-xs font-bold flex items-center gap-1 ${daysLeft < 0 ? 'text-rose-500' : 'text-indigo-500'}`}>
                                            <Clock size={14} strokeWidth={2.5} />
                                            {daysLeft < 0 ? t('goals.overdue', { days: Math.abs(daysLeft) }) : t('goals.days_left', { days: daysLeft })}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-zinc-400">{Math.round(progress)}%</span>
                                            <span className="text-zinc-900 dark:text-white">{formatCurrency(goal.current_amount)}</span>
                                        </div>
                                        <div className="h-4 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className={`h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`}
                                            />
                                        </div>
                                    </div>

                                    {!isCompleted && (
                                        <Button
                                            size="sm"
                                            className="w-full py-3 text-base bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                                            onClick={() => setTopUpGoal(goal)}
                                        >
                                            {t('goals.top_up')}
                                        </Button>
                                    )}
                                    {isCompleted && (
                                        <div className="w-full py-3 text-center text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                            {t('goals.completed')}
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}

                {/* Empty State */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="min-h-[240px] rounded-3xl border-2 border-dashed border-zinc-300 dark:border-white/10 flex flex-col items-center justify-center gap-4 text-zinc-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all group"
                >
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold">{t('goals.create_new')}</span>
                </button>
            </div>

            {/* MODAL: CREATE GOAL */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t('goals.create_title')}>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('goals.name_label')}</label>
                        <input
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white focus:border-indigo-500 shadow-sm transition-colors"
                            placeholder={t('goals.name_placeholder')}
                            value={createForm.name}
                            onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('goals.target_label')}</label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white focus:border-indigo-500 text-xl shadow-sm transition-colors"
                                placeholder="0"
                                value={createForm.target_amount}
                                onChange={e => setCreateForm({ ...createForm, target_amount: e.target.value })}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-bold">{settings.base_currency}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('goals.deadline_label')}</label>
                            <input
                                type="date"
                                className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white focus:border-indigo-500 shadow-sm transition-colors"
                                value={createForm.deadline}
                                onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('goals.icon_label')}</label>
                            <select
                                className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white shadow-sm appearance-none transition-colors"
                                value={createForm.icon}
                                onChange={e => setCreateForm({ ...createForm, icon: e.target.value })}
                            >
                                <option value="🎯">🎯</option>
                                <option value="🚗">🚗</option>
                                <option value="🏠">🏠</option>
                                <option value="💻">💻</option>
                                <option value="✈️">✈️</option>
                                <option value="🎓">🎓</option>
                                <option value="💰">💰</option>
                            </select>
                        </div>
                    </div>
                    <Button onClick={handleCreate} className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 text-white">{t('goals.create_btn')}</Button>
                </div>
            </Modal>

            {/* MODAL: TOP UP */}
            <Modal isOpen={!!topUpGoal} onClose={() => setTopUpGoal(null)} title={t('goals.top_up_title')}>
                <div className="space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-white/5">
                        <div className="text-4xl">{topUpGoal?.icon}</div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{topUpGoal?.name}</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase">{t('goals.remaining')} {topUpGoal ? formatCurrency(topUpGoal.target_amount - topUpGoal.current_amount) : 0}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block uppercase">{t('goals.account_label')}</label>
                        <select
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 transition-colors"
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                        >
                            <option value="">{t('goals.select_account')}</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance || 0)})</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <input
                            type="number"
                            autoFocus
                            className="w-full p-4 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500 text-2xl sm:text-3xl text-center text-emerald-600 dark:text-emerald-400 shadow-sm tabular-nums transition-colors"
                            placeholder="0"
                            value={topUpAmount}
                            onChange={e => setTopUpAmount(e.target.value)}
                        />
                        <div className="text-center text-xs font-bold text-zinc-400 dark:text-zinc-500 mt-2 uppercase">{t('goals.top_up_amount_label')}</div>
                    </div>

                    <Button onClick={handleTopUp} variant="success" className="w-full py-4 text-lg">
                        {t('goals.top_up_btn')}
                    </Button>
                </div>
            </Modal>

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
        </div>
    );
}
