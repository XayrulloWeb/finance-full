import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ChevronRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function MonthlyStats() {
    const { t, i18n } = useTranslation();
    const store = useFinanceStore();
    const isPrivacy = store.settings.is_privacy_enabled;

    // Helper for number formatting
    const formatNumber = (val) => new Intl.NumberFormat(i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(Math.round(val));

    const { analyticsSummary, isAnalyticsSummaryLoading } = store;

    // Default values if loading or no data
    const income = analyticsSummary?.totals?.income || 0;
    const expense = analyticsSummary?.totals?.expense || 0;
    const balance = analyticsSummary?.totals?.savings || 0;
    const budgetCompletion = store.getBudgetCompletion(); // This relies on budgets list, which IS fully loaded

    const stats = [
        {
            label: t('dashboard.stats.income'),
            value: income,
            icon: TrendingUp,
            color: 'success',
            delay: 0.1
        },
        {
            label: t('dashboard.stats.expense'),
            value: expense,
            icon: TrendingDown,
            color: 'error',
            delay: 0.2
        },
        {
            label: t('dashboard.stats.balance'),
            value: balance,
            icon: Wallet,
            color: balance >= 0 ? 'success' : 'error',
            delay: 0.3,
            prefix: balance >= 0 ? '+' : ''
        },
        {
            label: t('dashboard.stats.budgets'),
            value: `${budgetCompletion}%`,
            icon: ChevronRight,
            color: 'indigo',
            delay: 0.4,
            isPercent: true
        }
    ];

    return (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stat.delay }}
                >
                    <GlassCard className={`group transition-all hover:border-${stat.color === 'indigo' ? 'indigo-500' : stat.color}/50`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.color === 'indigo' ? 'bg-indigo-500/10' : stat.color === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                <stat.icon size={14} className={stat.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : stat.color === 'success' ? 'text-emerald-500' : 'text-rose-500'} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className={`text-2xl font-black tabular-nums ${stat.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : stat.color === 'success' ? 'text-emerald-500' : stat.color === 'error' ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                            {isPrivacy ? (stat.isPercent ? '••' : '•••••') : (
                                stat.isPercent ? stat.value : `${stat.prefix || ''}${formatNumber(stat.value)}`
                            )}
                        </div>
                        {!stat.isPercent && <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-1">{t('dashboard.stats.this_month')}</div>}
                        {stat.isPercent && <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-1">{t('dashboard.stats.avg_completion')}</div>}
                    </GlassCard>
                </motion.div>
            ))}
        </section>
    );
}
