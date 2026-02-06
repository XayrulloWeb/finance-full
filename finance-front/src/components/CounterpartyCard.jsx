import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Star, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

export default function CounterpartyCard({ counterparty, onEdit }) {
    const { deleteCounterparty, toggleFavorite, getCounterpartyStats } = useFinanceStore();
    const stats = getCounterpartyStats(counterparty.id);

    const handleDelete = async () => {
        if (confirm(`Удалить контрагента "${counterparty.name}"?`)) {
            await deleteCounterparty(counterparty.id);
        }
    };

    const handleToggleFavorite = async () => {
        await toggleFavorite(counterparty.id);
    };

    const typeLabels = {
        person: { label: 'Человек', icon: '👤', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
        company: { label: 'Компания', icon: '🏢', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
        organization: { label: 'Организация', icon: '🏛️', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' }
    };

    const typeConfig = typeLabels[counterparty.type] || { label: counterparty.type, icon: '❓', color: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400' };

    return (
        <div
            className="flex flex-col h-full bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-zinc-200 dark:border-white/5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            style={{ borderTop: `4px solid ${counterparty.color}` }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                        style={{ backgroundColor: `${counterparty.color}20`, color: counterparty.color }}
                    >
                        {counterparty.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-zinc-900 dark:text-white leading-tight mb-1">{counterparty.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${typeConfig.color}`}>
                            <span>{typeConfig.icon}</span>
                            {typeConfig.label}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-xl transition-all ${counterparty.favorite
                        ? 'text-yellow-400 bg-yellow-400/10'
                        : 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-yellow-400'
                        }`}
                >
                    <Star size={20} fill={counterparty.favorite ? 'currentColor' : 'none'} strokeWidth={2.5} />
                </button>
            </div>

            {/* Статистика - занимает доступное пространство */}
            <div className="flex-1">
                {stats.transactionCount > 0 ? (
                    <div className="grid grid-cols-1 gap-2 mb-4">
                        {stats.totalIncome > 0 && (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                                        <TrendingUp size={16} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-sm font-bold">Получено</span>
                                </div>
                                <div className="font-black text-emerald-700 dark:text-emerald-400">
                                    {stats.totalIncome.toLocaleString()} UZS
                                </div>
                            </div>
                        )}
                        {stats.totalExpense > 0 && (
                            <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/10">
                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                    <div className="p-1.5 bg-rose-100 dark:bg-rose-500/20 rounded-lg">
                                        <TrendingDown size={16} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-sm font-bold">Заплачено</span>
                                </div>
                                <div className="font-black text-rose-700 dark:text-rose-400">
                                    {stats.totalExpense.toLocaleString()} UZS
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 space-y-2 mb-4 min-h-[80px]">
                        <div className="w-12 h-1 bg-zinc-100 dark:bg-white/5 rounded-full" />
                        <span className="text-xs font-medium">Нет транзакций</span>
                    </div>
                )}

                {/* Заметки */}
                {counterparty.notes && (
                    <div className="mb-4 px-3 py-2 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">"{counterparty.notes}"</p>
                    </div>
                )}
            </div>

            {/* Футер с действиями */}
            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-white/5">
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(counterparty)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-xl font-bold text-zinc-700 dark:text-white transition-all text-sm group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                    >
                        <Edit2 size={16} strokeWidth={2.5} />
                        Изменить
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-3 bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                        <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}
