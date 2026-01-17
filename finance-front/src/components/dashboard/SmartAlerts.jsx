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
                icon: alert.type === 'danger' ? '??' : alert.type === 'success' ? '?' : '?',
                title,
                message,
                action: null
            });
        });


        // 1. Бюджеты
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

        // 2. Отрицательный баланс
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

    return (
        <section className="space-y-3">
            {alerts.map((alert, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                >
                    <div
                        className={`relative overflow-hidden rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                            alert.type === 'danger'
                                ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-300 hover:border-rose-400'
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400'
                        }`}
                        onClick={alert.action || undefined}
                    >
                        <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">{alert.icon}</div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-sm mb-1 text-zinc-900">{alert.title}</h3>
                                <p className="text-xs font-bold text-zinc-600">{alert.message}</p>
                            </div>
                            {alert.action && (
                                <ChevronRight className="flex-shrink-0 text-zinc-400" size={20} />
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </section>
    );
}