import React, { useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { TrendingUp, TrendingDown, Activity, Lightbulb } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { useTranslation } from 'react-i18next';

export default function Insights() {
    const { t, i18n } = useTranslation();
    // 1. Используем селекторы для подписки только на нужные части стора
    const fetchInsights = useFinanceStore(s => s.fetchInsights);
    const insights = useFinanceStore(s => s.insightsData);
    const isLoading = useFinanceStore(s => s.isInsightsLoading);
    const fetchAiInsight = useFinanceStore(s => s.fetchAiInsight);
    const aiInsight = useFinanceStore(s => s.aiInsight);
    const isAiLoading = useFinanceStore(s => s.isAiInsightLoading);

    // 2. Загружаем данные при первом рендере компонента
    useEffect(() => {
        // Загружаем данные только если их еще нет в сторе
        if (!insights) {
            fetchInsights();
        }
    }, [fetchInsights, insights]);

    useEffect(() => {
        if (!aiInsight) {
            fetchAiInsight();
        }
    }, [fetchAiInsight, aiInsight]);

    const formatCurrency = (val) => new Intl.NumberFormat(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(Math.round(val || 0));

    const aiDisplay = aiInsight || {
        mood: 'neutral',
        title: t('insights.ai_unavailable_title'),
        message: t('insights.ai_unavailable_message'),
        icon: null
    };

    const moodStyles = {
        success: 'from-emerald-500 to-teal-600',
        warning: 'from-amber-500 to-orange-500',
        danger: 'from-rose-500 to-red-600',
        neutral: 'from-slate-500 to-slate-600'
    };

    const aiMoodClass = moodStyles[aiDisplay.mood] || moodStyles.neutral;

    // 3. Добавляем состояние загрузки для лучшего UX
    if (isLoading || !insights) {
        return (
            <div className="space-y-6 animate-fade-in pb-28 sm:pb-32">
                <SkeletonLoader type="text" count={2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SkeletonLoader type="card" count={2} />
                </div>
                <SkeletonLoader type="chart" />
            </div>
        );
    }

    // 4. Используем готовые, посчитанные на сервере данные
    const { thisMonthExpenses, lastMonthExpenses, topCategories } = insights;

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-28 sm:pb-32 custom-scrollbar">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <Lightbulb size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-zinc-900">{t('insights.title')}</h1>
                    <p className="text-zinc-500">{t('insights.subtitle')}</p>
                </div>
            </div>

            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="space-y-2">
                    <div className="text-zinc-500 text-sm font-bold uppercase flex items-center gap-2">
                        <Activity size={16} strokeWidth={2.5} /> {t('insights.expenses_this_month')}
                    </div>
                    <div className="text-2xl font-black text-zinc-900">{formatCurrency(thisMonthExpenses)}</div>
                    <div className={`text-xs font-bold flex items-center gap-1 ${thisMonthExpenses > lastMonthExpenses ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {thisMonthExpenses > lastMonthExpenses ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
                        {`${formatCurrency(Math.abs(thisMonthExpenses - lastMonthExpenses))} ${t('insights.diff_last_month')}`}
                    </div>
                </GlassCard>
                <div>
                    {isAiLoading && !aiInsight ? (
                        <SkeletonLoader type="card" count={1} />
                    ) : (
                        <GlassCard className="space-y-3 relative overflow-hidden text-white" hover={false}>
                            <div className={`absolute inset-0 opacity-90 bg-gradient-to-br ${aiMoodClass}`} />
                            <div className="relative z-10">
                                <div className="text-white/80 text-sm font-bold uppercase flex items-center gap-2">
                                    {aiDisplay.icon ? (
                                        <span className="text-2xl">{aiDisplay.icon}</span>
                                    ) : (
                                        <Lightbulb size={18} strokeWidth={2.5} />
                                    )}
                                    {t('insights.advice_title')}
                                </div>
                                <div className="text-xl font-black mt-3">{aiDisplay.title}</div>
                                <p className="text-sm text-white/90 font-medium mt-2">{aiDisplay.message}</p>
                            </div>
                        </GlassCard>
                    )}
                </div>

            </div>

            {/* TRENDS */}
            <GlassCard className="p-6">
                <h3 className="font-bold mb-6 text-lg text-zinc-900">{t('insights.top_5')}</h3>
                <div className="space-y-4">
                    {(topCategories || []).map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between group p-2 hover:bg-zinc-50 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl border border-zinc-200">
                                    {cat.icon}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-zinc-900">{cat.name}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-zinc-900">{formatCurrency(cat.current)}</div>
                            </div>
                        </div>
                    ))}
                    {(!topCategories || topCategories.length === 0) && (
                        <p className="text-center text-zinc-400 py-4">{t('insights.no_expenses')}</p>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
