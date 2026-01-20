import React, { useState, useEffect } from 'react';
import { X, User, Building2, Landmark, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_ICONS = ['👤', '👨‍💼', '👩‍💼', '🏢', '🏛️', '🏪', '🏦', '💼', '🤝', '👥', '🏭', '🗂️'];
const COLORS = [
    { value: '#8b5cf6', name: 'Violet' },
    { value: '#06b6d4', name: 'Cyan' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#ef4444', name: 'Red' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#3b82f6', name: 'Blue' },
    { value: '#6366f1', name: 'Indigo' },
];

const TYPE_OPTIONS = [
    { value: 'person', icon: User, labelKey: 'counterparty_modal.type_person' },
    { value: 'company', icon: Building2, labelKey: 'counterparty_modal.type_company' },
    { value: 'organization', icon: Landmark, labelKey: 'counterparty_modal.type_organization' },
];

export default function CounterpartyModal({ isOpen, onClose, onSubmit, initialData = null }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        type: 'company',
        icon: '👤',
        color: '#8b5cf6',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || {
                name: '',
                type: 'company',
                icon: '👤',
                color: '#8b5cf6',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 pt-safe pb-safe"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-[#0f0f16] rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden border border-zinc-200 dark:border-violet-500/10 shadow-2xl dark:shadow-violet-900/30 my-auto"
                >
                    {/* Header with Gradient */}
                    <div className="relative px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                        <div className="relative flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                                        {initialData ? t('counterparty_modal.title_edit') : t('counterparty_modal.title_new')}
                                    </h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                        {t('counterparty_modal.subtitle', 'Добавьте нового контрагента')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar">

                        {/* Name Input */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2">
                                {t('counterparty_modal.name_label')}
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-white/5 rounded-2xl outline-none font-medium text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 border-2 border-transparent focus:border-violet-500 dark:focus:border-violet-500 transition-all"
                                placeholder={t('counterparty_modal.name_placeholder')}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Type Selection */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3">
                                {t('counterparty_modal.type_label')}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {TYPE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: value })}
                                        className={`relative p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${formData.type === value
                                            ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 scale-[1.02]'
                                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon size={24} strokeWidth={2} />
                                        <span className="text-xs">{t(labelKey)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Icon Selection */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3">
                                {t('counterparty_modal.icon_label')}
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {EMOJI_ICONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, icon: emoji })}
                                        className={`aspect-square text-2xl rounded-xl transition-all flex items-center justify-center ${formData.icon === emoji
                                            ? 'bg-violet-100 dark:bg-violet-500/20 ring-2 ring-violet-500 scale-110'
                                            : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 hover:scale-105'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3">
                                {t('counterparty_modal.color_label')}
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {COLORS.map(({ value, name }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: value })}
                                        className={`w-10 h-10 rounded-xl transition-all ${formData.color === value
                                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0f0f16] ring-zinc-900 dark:ring-white scale-110'
                                            : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: value }}
                                        title={name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2">
                                {t('counterparty_modal.notes_label')}
                            </label>
                            <textarea
                                className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-white/5 rounded-2xl outline-none font-medium text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 border-2 border-transparent focus:border-violet-500 transition-all resize-none"
                                placeholder={t('counterparty_modal.notes_placeholder', 'Дополнительная информация...')}
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </form>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-2xl font-bold transition text-zinc-700 dark:text-zinc-400"
                        >
                            {t('counterparty_modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40"
                        >
                            {initialData ? t('counterparty_modal.save') : t('counterparty_modal.create')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
