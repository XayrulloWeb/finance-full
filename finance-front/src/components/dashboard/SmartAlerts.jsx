import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function SmartAlerts() {
    const { t } = useTranslation();
    const store = useFinanceStore();
    const fetchAiAlerts = useFinanceStore(s => s.fetchAiAlerts);
    const aiAlerts = useFinanceStore(s => s.aiAlerts);
    const isAiAlertsLoading = useFinanceStore(s => s.isAiAlertsLoading);

    useEffect(() => {
        if (!aiAlerts || aiAlerts.length === 0) {
            fetchAiAlerts();
        }
    }, [fetchAiAlerts, aiAlerts]);

    const getSmartAlerts = () => {
        const alerts = [];

        (aiAlerts || []).forEach((alert) => {
            const code = alert.code || 'generic';
            const dataPayload = alert.data || {};
            const title = alert.title || t(`ai.alerts.${code}.title`, dataPayload);
            const message = alert.message || t(`ai.alerts.${code}.message`, dataPayload);
            alerts.push({
                type: alert.type || 'warning',
                icon: alert.type === 'danger' ? '🚨' : alert.type === 'success' ? '✅' : '💡',
                title,
                message,
                action: null
            });
        });

        // Budget alerts
        store.budgets.forEach(budget => {
            const progress = store.getBudgetProgress(budget.category_id);
            if (progress && progress.percent > 100) {
                alerts.push({
                    type: 'danger',
                    icon: '🚨',
                    title: 'Превышен бюджет!',
                    message: `Категория "${progress.categoryName}": ${progress.percent.toFixed(0)}%`,
                    action: () => window.location.href = '/analytics'
                });
            }
        });

        // Negative balance alerts
        const negativeAccounts = store.accounts.filter(acc => store.getAccountBalance(acc.id) < 0);
        if (negativeAccounts.length > 0) {
            alerts.push({
                type: 'danger',
                icon: '💸',
                title: 'Отрицательный баланс!',
                message: `Счета: ${negativeAccounts.map(a => a.name).join(', ')}`,
                action: null
            });
        }

        return alerts.slice(0, 3);
    };

    const alerts = getSmartAlerts();

    if (isAiAlertsLoading && alerts.length === 0) return null;
    if (alerts.length === 0) return null;

    const getAlertStyle = (type) => {
        if (type === 'danger') return {
            bg: 'bg-gradient-to-r from-rose-500/8 to-red-500/5 dark:from-rose-500/10 dark:to-red-500/5',
            border: 'border-rose-200/60 dark:border-rose-500/15',
            titleColor: 'text-rose-900 dark:text-rose-200',
        };
        if (type === 'success') return {
            bg: 'bg-gradient-to-r from-emerald-500/8 to-green-500/5 dark:from-emerald-500/10 dark:to-green-500/5',
            border: 'border-emerald-200/60 dark:border-emerald-500/15',
            titleColor: 'text-emerald-900 dark:text-emerald-200',
        };
        return {
            bg: 'bg-gradient-to-r from-blue-500/8 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/5',
            border: 'border-blue-200/60 dark:border-blue-500/15',
            titleColor: 'text-blue-900 dark:text-blue-200',
        };
    };

    return (
        <section className="space-y-3">
            {alerts.map((alert, idx) => {
                const style = getAlertStyle(alert.type);
                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: -15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div
                            className={`relative overflow-hidden rounded-2xl p-4 border cursor-pointer transition-all ${style.bg} ${style.border} backdrop-blur-xl hover:scale-[1.01] active:scale-[0.99]`}
                            style={{
                                backdropFilter: 'blur(20px) saturate(180%)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            }}
                            onClick={alert.action || undefined}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-2xl flex-shrink-0">{alert.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-black text-sm mb-1 ${style.titleColor}`}>{alert.title}</h3>
                                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{alert.message}</p>
                                </div>
                                {alert.action && (
                                    <ChevronRight className="flex-shrink-0 text-zinc-400" size={20} />
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </section>
    );
}