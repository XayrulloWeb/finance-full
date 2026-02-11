import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function BalanceCard() {
    const { t, i18n } = useTranslation();
    const { settings, togglePrivacy, getTotalBalanceInBaseCurrency, analyticsSummary } = useFinanceStore();

    const totalBalance = getTotalBalanceInBaseCurrency ? getTotalBalanceInBaseCurrency() : 0;
    const isPrivacy = settings.is_privacy_enabled;
    const currency = settings.base_currency;

    const getTodayStats = () => {
        if (!analyticsSummary?.trend) return { income: 0, expense: 0 };
        const todayStr = new Date().toISOString().split('T')[0];
        const todayData = analyticsSummary.trend.find(d => d.date === todayStr);
        return todayData || { income: 0, expense: 0 };
    };

    const { income: todayIncome, expense: todayExpense } = getTodayStats();
    const formatNumber = (val) => new Intl.NumberFormat(i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(Math.round(val || 0));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[28px] min-h-[240px] p-8"
            style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.92) 40%, rgba(109, 40, 217, 0.88) 70%, rgba(139, 92, 246, 0.85) 100%)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                boxShadow: '0 25px 60px -12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
        >
            {/* iOS-style ambient light layers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-300/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-violet-200/10 rounded-full blur-3xl rotate-12" />
                {/* Subtle noise/grain overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
                />
                {/* Top highlight line */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>

            <div className="relative z-10 text-white">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/15 rounded-2xl backdrop-blur-xl border border-white/20">
                            <Wallet size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold tracking-wider uppercase opacity-80">{t('dashboard.balance_card.total_capital')}</span>
                    </div>
                    <button
                        onClick={togglePrivacy}
                        className="p-2.5 hover:bg-white/15 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-white/10"
                    >
                        {isPrivacy ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                    </button>
                </div>

                {/* Main Balance */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-8"
                >
                    <div className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums leading-none">
                        {isPrivacy ? '••••••' : formatNumber(totalBalance)}
                        <span className="text-2xl sm:text-3xl opacity-50 ml-2 font-bold">{currency}</span>
                    </div>
                </motion.div>

                {/* Today Stats */}
                <div className="flex gap-3">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/15"
                        style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <TrendingUp size={16} className="text-emerald-300" strokeWidth={2.5} />
                        <span className="text-emerald-100 font-bold text-sm tabular-nums">
                            {isPrivacy ? '•••' : `+${formatNumber(todayIncome)}`}
                        </span>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/15"
                        style={{
                            background: 'rgba(244, 63, 94, 0.2)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <TrendingDown size={16} className="text-rose-300" strokeWidth={2.5} />
                        <span className="text-rose-100 font-bold text-sm tabular-nums">
                            {isPrivacy ? '•••' : `-${formatNumber(todayExpense)}`}
                        </span>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
