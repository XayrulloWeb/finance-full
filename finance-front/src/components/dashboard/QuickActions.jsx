
import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, ShoppingCart, Car } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

const QuickActionButton = ({ icon: IconComponent, label, category, onClick }) => (
    <button
        onClick={() => onClick('expense', category)}
        className="flex flex-col items-center gap-2.5 min-w-[80px] group"
    >
        <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-zinc-200/60 dark:border-white/8 hover:border-indigo-400 dark:hover:border-indigo-400/50 transition-all shadow-sm group-active:scale-95 group-hover:shadow-lg group-hover:shadow-indigo-500/10"
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
            }}
        >
            <IconComponent size={22} className="text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" strokeWidth={2} />
        </div>
        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors text-center max-w-[80px] truncate">
            {label}
        </span>
    </button>
);

export default function QuickActions({ onAction }) {
    const { t } = useTranslation();
    const { getTopUsedCategories } = useFinanceStore();
    const topCategories = getTopUsedCategories(6);

    const defaultActions = [
        { icon: Coffee, label: t('category_names.cafe'), category: t('category_names.cafe') },
        { icon: ShoppingCart, label: t('category_names.groceries'), category: t('category_names.groceries') },
        { icon: Car, label: t('category_names.transport'), category: t('category_names.transport') },
    ];

    return (
        <section>
            <div className="flex justify-between items-center mb-5 px-1">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/10 text-base">⚡</span>
                    {t('dashboard.quick_actions.title')}
                </h2>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 px-1 custom-scrollbar">
                {defaultActions.map((action, idx) => (
                    <QuickActionButton
                        key={`def-${idx}`}
                        {...action}
                        onClick={onAction}
                        label={action.label}
                    />
                ))}

                {topCategories.map((cat, idx) => (
                    <motion.button
                        key={cat.categoryId || idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onAction('expense', cat.name)}
                        className="flex flex-col items-center gap-2.5 min-w-[80px] group"
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-zinc-200/60 dark:border-white/8 hover:border-violet-400 dark:hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all shadow-sm group-active:scale-95"
                            style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                            }}
                        >
                            <span className="text-2xl">{cat.icon}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-violet-500 transition-colors text-center max-w-[80px] truncate">
                            {cat.name}
                        </span>
                    </motion.button>
                ))}
            </div>
        </section>
    );
}