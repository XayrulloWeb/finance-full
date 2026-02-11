import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ChevronRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function MonthlyStats() {
    const { t, i18n } = useTranslation();
    const store = useFinanceStore();
    const isPrivacy = store.settings.is_privacy_enabled;

    const formatNumber = (val) => new Intl.NumberFormat(i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(Math.round(val));

    const { analyticsSummary, isAnalyticsSummaryLoading } = store;

    const income = analyticsSummary?.totals?.income || 0;
    const expense = analyticsSummary?.totals?.expense || 0;
    const balance = analyticsSummary?.totals?.savings || 0;
    const budgetCompletion = store.getBudgetCompletion();

    const stats = [
        {
            label: t('dashboard.stats.income'),
            value: income,
            icon: TrendingUp,
            gradient: 'from-emerald-500/15 to-emerald-500/5',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-500',
            valueColor: 'text-emerald-500',
            glowColor: 'rgba(16, 185, 129, 0.08)',
            delay: 0.1
        },
        {
            label: t('dashboard.stats.expense'),
            value: expense,
            icon: TrendingDown,
            gradient: 'from-rose-500/15 to-rose-500/5',
            iconBg: 'bg-rose-500/15',
            iconColor: 'text-rose-500',
            valueColor: 'text-rose-500',
            glowColor: 'rgba(244, 63, 94, 0.08)',
            delay: 0.15
        },
        {
            label: t('dashboard.stats.balance'),
            value: balance,
            icon: Wallet,
            gradient: balance >= 0 ? 'from-emerald-500/15 to-emerald-500/5' : 'from-rose-500/15 to-rose-500/5',
            iconBg: balance >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15',
            iconColor: balance >= 0 ? 'text-emerald-500' : 'text-rose-500',
            valueColor: balance >= 0 ? 'text-emerald-500' : 'text-rose-500',
            glowColor: balance >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            prefix: balance >= 0 ? '+' : '',
            delay: 0.2
        },
        {
            label: t('dashboard.stats.budgets'),
            value: `${budgetCompletion}%`,
            icon: ChevronRight,
            gradient: 'from-violet-500/15 to-indigo-500/5',
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-500 dark:text-violet-400',
            valueColor: 'text-violet-600 dark:text-violet-400',
            glowColor: 'rgba(139, 92, 246, 0.08)',
            isPercent: true,
            delay: 0.25
        }
    ];

    return (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: stat.delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div
                        className="glass-panel relative overflow-hidden p-4 sm:p-5 group"
                        style={{ boxShadow: `0 8px 32px ${stat.glowColor}` }}
                    >
                        {/* Subtle gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50 rounded-3xl`} />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                                <div className={`p-1.5 rounded-xl ${stat.iconBg} backdrop-blur-sm`}>
                                    <stat.icon size={14} className={stat.iconColor} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className={`text-xl sm:text-2xl font-black tabular-nums ${stat.valueColor}`}>
                                {isPrivacy ? (stat.isPercent ? '••' : '•••••') : (
                                    stat.isPercent ? stat.value : `${stat.prefix || ''}${formatNumber(stat.value)}`
                                )}
                            </div>
                            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-1.5">
                                {stat.isPercent ? t('dashboard.stats.avg_completion') : t('dashboard.stats.this_month')}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </section>
    );
}
