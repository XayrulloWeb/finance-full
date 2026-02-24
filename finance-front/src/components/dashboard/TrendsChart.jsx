import React, { useState } from 'react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, AreaChart } from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function TrendsChart() {
    const { t, i18n } = useTranslation();
    const [trendsPeriod, setTrendsPeriod] = useState(7);
    const analyticsSummary = useFinanceStore(s => s.analyticsSummary);
    const isDark = useFinanceStore(s => s.settings?.dark_mode);

    const rawData = analyticsSummary?.trend || [];
    const data = rawData.slice(trendsPeriod === 7 ? -7 : -30).map(item => ({
        ...item,
        name: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    }));

    const formatNumber = (val) => new Intl.NumberFormat(i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(val);

    return (
        <section>
            <div className="flex justify-between items-center mb-5 px-1">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-base">📈</span>
                    {t('dashboard.trends.title')}
                </h2>
                <div
                    className="flex gap-1 rounded-2xl p-1 border border-zinc-200/60 dark:border-white/8 backdrop-blur-sm md:backdrop-blur-xl"
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                    }}
                >
                    {[7, 30].map(period => (
                        <button
                            key={period}
                            onClick={() => setTrendsPeriod(period)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${trendsPeriod === period
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                                }`}
                        >
                            {period} {t('analytics.days_suffix')}
                        </button>
                    ))}
                </div>
            </div>
            <div
                className="glass-panel relative overflow-hidden p-5 sm:p-6"
            >
                {/* Subtle gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/3 to-cyan-500/3 dark:from-violet-500/5 dark:to-cyan-500/5 rounded-3xl" />

                <div className="relative z-10">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                            <XAxis
                                dataKey="name"
                                stroke={isDark ? '#6b6b80' : '#a1a1aa'}
                                style={{ fontSize: '11px', fontWeight: '600' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke={isDark ? '#6b6b80' : '#a1a1aa'}
                                style={{ fontSize: '11px', fontWeight: '600' }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDark ? 'rgba(15, 15, 22, 0.9)' : 'rgba(255, 255, 255, 0.85)',
                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                    borderRadius: '16px',
                                    boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: isDark ? '#eeeef2' : '#0f172a',
                                    backdropFilter: 'blur(20px)',
                                }}
                                formatter={(value) => formatNumber(value)}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#eeeef2' : '#0f172a' }}
                                iconType="circle"
                            />
                            <Area
                                type="monotone"
                                dataKey="income"
                                name={t('dashboard.stats.income')}
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#incomeGrad)"
                                dot={false}
                                activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="expense"
                                name={t('dashboard.stats.expense')}
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                fill="url(#expenseGrad)"
                                dot={false}
                                activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
}
