import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { ArrowRightLeft, Plus, TrendingUp, TrendingDown, CreditCard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import TransactionItem from '../components/TransactionItem';
import GlassCard from '../components/ui/GlassCard';
import { toast } from '../components/ui/Toast';
import SkeletonLoader from '../components/ui/SkeletonLoader';

// Components
import SmartAlerts from '../components/dashboard/SmartAlerts';
import BalanceCard from '../components/dashboard/BalanceCard';
import MonthlyStats from '../components/dashboard/MonthlyStats';
import TrendsChart from '../components/dashboard/TrendsChart';
import QuickActions from '../components/dashboard/QuickActions';
import AccountModal from '../components/modals/AccountModal';
import TransactionModal from '../components/modals/TransactionModal';

import { useTranslation } from 'react-i18next'; // Import hook

export default function Dashboard() {
    const { t } = useTranslation(); // Init hook
    // --- OPTIMIZED ZUSTAND SELECTORS ---
    // Подписываемся только на те части стора, которые используются в этом компоненте
    const loading = useFinanceStore(s => s.loading);
    const accounts = useFinanceStore(s => s.accounts);
    const recentTransactions = useFinanceStore(s => s.recentTransactions);
    const categories = useFinanceStore(s => s.categories);
    const counterparties = useFinanceStore(s => s.counterparties);
    const isPrivacy = useFinanceStore(s => s.settings.is_privacy_enabled);
    const currency = useFinanceStore(s => s.settings.base_currency);
    const openModal = useFinanceStore(s => s.openModal);
    const fetchAiForecast = useFinanceStore(s => s.fetchAiForecast);
    const aiForecast = useFinanceStore(s => s.aiForecast);
    const isAiForecastLoading = useFinanceStore(s => s.isAiForecastLoading);

    const getTopExpenseCategories = useFinanceStore(s => s.getTopExpenseCategories);
    const getAccountBalance = useFinanceStore(s => s.getAccountBalance);

    useEffect(() => {
        fetchAiForecast();
    }, [fetchAiForecast]);


    // --- 🔥 ЗАЩИТА: ПОКАЗЫВАЕМ СКЕЛЕТОНЫ ПРИ ЗАГРУЗКЕ ---
    if (loading && accounts.length === 0) {
        return (
            <div className="space-y-8 animate-fade-in pb-28 sm:pb-32 px-1">
                <div className="space-y-4">
                    <SkeletonLoader type="text" count={1} />
                    <SkeletonLoader type="card" count={1} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SkeletonLoader type="stat" count={4} />
                </div>
                <SkeletonLoader type="chart" count={1} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SkeletonLoader type="card" count={3} />
                </div>
            </div>
        );
    }

    // --- HANDLERS ---
    const openTxModal = (type = 'expense', categoryName = null, accountId = null) => {
        if (accounts.length === 0) return toast.error(t('settings.accounts') + ' required'); // Simple fallback translation
        openModal('transaction', { initialType: type, initialCategoryName: categoryName, initialAccountId: accountId });
    };

    return (
        <div className="space-y-8 sm:space-y-10 animate-fade-in pb-40 sm:pb-48">

            <SmartAlerts />
            <BalanceCard />
            <MonthlyStats />

            {/* AI Forecast */}
            {isAiForecastLoading && !aiForecast ? (
                <SkeletonLoader type="card" count={1} />
            ) : aiForecast ? (
                <GlassCard className="relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">{t('ai.forecast.title')}</div>
                        <TrendingUp className="text-emerald-500" size={18} strokeWidth={2.5} />
                    </div>
                    <div className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
                        {isPrivacy ? '?????' : new Intl.NumberFormat('ru-RU').format(Math.round(aiForecast.forecastExpense || 0))} {currency}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-2">
                        {aiForecast.message || t('ai.forecast.message', { value: new Intl.NumberFormat('ru-RU').format(Math.round(aiForecast.forecastExpense || 0)) })}
                    </p>
                </GlassCard>
            ) : null}


            {/* Top Expense Categories */}
            <section>
                <div className="flex justify-between items-center mb-4 px-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">🔥 {t('analytics.top_expenses')}</h2>
                </div>
                <GlassCard>
                    <div className="space-y-4">
                        {getTopExpenseCategories(3).map((cat, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{cat.icon}</div>
                                        <div>
                                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</div>
                                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                                {isPrivacy ? '•••••' : new Intl.NumberFormat('ru-RU').format(Math.round(cat.amount))} {currency}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-error">{cat.percentage}%</div>
                                    </div>
                                </div>
                                <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
                                    <div style={{ width: `${cat.percentage}%` }} className={`h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500`} />
                                </div>
                            </div>
                        ))}
                        {getTopExpenseCategories(3).length === 0 && <div className="text-center text-zinc-400 py-4 font-medium">{t('analytics.no_expenses')}</div>}
                    </div>
                </GlassCard>
            </section>

            <QuickActions onAction={(type, cat) => openTxModal(type, cat)} />
            <TrendsChart />

            {/* Accounts List */}
            <section>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 px-1 flex gap-2">
                    <CreditCard className="text-primary" strokeWidth={2.5} /> {t('settings.accounts')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((acc) => (
                        <GlassCard
                            key={acc.id}
                            onClick={() => openTxModal('expense', null, acc.id)}
                            className="cursor-pointer transition-all group hover:shadow-2xl hover:shadow-indigo-500/20"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-2xl p-[2px]">
                                        <div
                                            className="absolute inset-0 rounded-2xl opacity-90"
                                            style={{ background: `linear-gradient(135deg, ${acc.color}55, ${acc.color})` }}
                                        />
                                        <div className="relative w-full h-full rounded-[14px] bg-white/80 dark:bg-slate-900/80 flex items-center justify-center text-xl shadow-sm">
                                            {acc.icon}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                                            {acc.name}
                                        </div>
                                        <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10 px-2 py-1 rounded-md inline-flex mt-1">
                                            {acc.currency}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black tabular-nums text-zinc-900 dark:text-white">
                                        {isPrivacy ? '••••' : new Intl.NumberFormat('ru-RU').format(getAccountBalance(acc.id))}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}

                    <button
                        onClick={() => openModal('account')}
                        className="min-h-[120px] border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center text-zinc-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all font-bold group"
                    >
                        <div className="p-3 rounded-full bg-zinc-100 group-hover:bg-primary/10 mb-2 transition-colors">
                            <Plus size={24} className="text-zinc-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span> {t('common.add')} {t('settings.accounts')}</span>
                    </button>
                </div>
            </section>

            {/* Recent Transactions */}
            <section>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 px-1">{t('dashboard.recent_activity')}</h2>
                <div className="space-y-3">
                    {recentTransactions.length > 0 ? (
                        recentTransactions.map(t => (
                            <TransactionItem
                                key={t.id}
                                transaction={t}
                                category={categories.find(c => c.id === t.category_id)}
                                account={accounts.find(a => a.id === t.account_id)}
                                counterparty={counterparties.find(cp => cp.id === t.counterparty_id)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl bg-white/50">
                            <p className="font-bold">No transactions</p>
                            <p className="text-sm mt-1">{t('common.add')} first transaction</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 🚀 FLOATING ACTION BUTTON (Desktop) */}
            <DesktopFAB openModal={openModal} accounts={accounts} t={t} />
        </div>
    );
}

// 🎯 Desktop Floating Action Button Component
function DesktopFAB({ openModal, accounts, t }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (modalType, props = {}) => {
        if (accounts.length === 0) {
            toast.error(t('settings.accounts') + ' required');
            return;
        }
        openModal(modalType, props);
        setIsOpen(false);
    };

    const fabActions = [
        {
            id: 'income',
            icon: TrendingUp,
            label: t('common.income') || 'Доход',
            color: 'bg-emerald-500 hover:bg-emerald-600',
            shadow: 'shadow-emerald-500/40',
            onClick: () => handleAction('transaction', { initialType: 'income' })
        },
        {
            id: 'expense',
            icon: TrendingDown,
            label: t('common.expense') || 'Расход',
            color: 'bg-rose-500 hover:bg-rose-600',
            shadow: 'shadow-rose-500/40',
            onClick: () => handleAction('transaction', { initialType: 'expense' })
        },
        {
            id: 'transfer',
            icon: ArrowRightLeft,
            label: t('common.transfer') || 'Перевод',
            color: 'bg-indigo-500 hover:bg-indigo-600',
            shadow: 'shadow-indigo-500/40',
            onClick: () => handleAction('transfer')
        }
    ];

    return (
        <div className="hidden lg:block fixed bottom-8 right-8 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute bottom-20 right-0 flex flex-col gap-3 items-end"
                    >
                        {fabActions.map((action, idx) => (
                            <motion.button
                                key={action.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={action.onClick}
                                className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-white font-bold shadow-lg ${action.color} ${action.shadow} transition-all hover:scale-105 active:scale-95`}
                            >
                                <action.icon size={20} strokeWidth={2.5} />
                                <span>{action.label}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-2xl transition-all duration-300 ${isOpen
                    ? 'bg-zinc-800 rotate-45 shadow-zinc-800/30'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/40 hover:shadow-teal-500/60'
                    }`}
            >
                {isOpen ? <X size={28} strokeWidth={2.5} /> : <Plus size={32} strokeWidth={2.5} />}
            </motion.button>
        </div>
    );
}
