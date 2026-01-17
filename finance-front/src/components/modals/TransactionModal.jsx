import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { toast } from '../ui/Toast';
import { useTranslation } from 'react-i18next';

export default function TransactionModal({
    isOpen,
    onClose,
    initialType = 'expense',
    initialCategoryName = null,
    initialAccountId = null,
    editingTransaction = null
}) {
    const { t, i18n } = useTranslation();
    const store = useFinanceStore();
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);

    // Modes: Category or Counterparty
    const [txMode, setTxMode] = useState('category');

    const [form, setForm] = useState({
        type: 'expense',
        amount: '',
        account_id: '',
        category_id: '',
        counterparty_id: '',
        comment: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Init functionality (same as before)
    useEffect(() => {
        if (isOpen) {
            setAiSuggestion(null);
            if (editingTransaction) {
                // EDIT MODE
                setForm({
                    type: editingTransaction.type,
                    amount: editingTransaction.amount,
                    account_id: editingTransaction.account_id,
                    category_id: editingTransaction.category_id || '',
                    counterparty_id: editingTransaction.counterparty_id || '',
                    comment: editingTransaction.comment || '',
                    date: editingTransaction.date.split('T')[0]
                });
                setTxMode(editingTransaction.counterparty_id ? 'counterparty' : 'category');
            } else {
                // CREATE MODE
                let categoryId = '';
                if (initialCategoryName) {
                    const found = store.categories.find(c => c.name.toLowerCase().includes(initialCategoryName.toLowerCase()) && c.type === initialType);
                    if (found) categoryId = found.id;
                }

                setForm({
                    type: initialType,
                    amount: '',
                    account_id: initialAccountId || store.accounts[0]?.id || '',
                    category_id: categoryId,
                    counterparty_id: '',
                    comment: '',
                    date: new Date().toISOString().split('T')[0]
                });
                setTxMode('category');
            }
        }
    }, [isOpen, editingTransaction, initialType, initialCategoryName, initialAccountId, store.accounts, store.categories]);

    const categories = store.categories.filter(c => c.type === form.type);

    const handleAiSuggest = async () => {
        if (!form.comment && !form.amount) {
            return toast.error(t('modals.transaction.ai_need_input'));
        }
        setAiLoading(true);
        try {
            const { data } = await api.post('/ai/transaction-suggest', {
                type: form.type,
                comment: form.comment,
                amount: Number(form.amount) || null
            });
            setAiSuggestion(data);
        } catch (error) {
            console.error('AI Suggest Error:', error);
            toast.error(t('modals.transaction.ai_error'));
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async () => {
        // --- VALIDATION ---
        if (!form.account_id) return toast.error(t('modals.transaction.error_account'));
        if (!form.amount || parseFloat(form.amount) <= 0) return toast.error(t('modals.transaction.error_amount'));

        if (form.type === 'expense' && txMode === 'category' && !form.category_id) {
            return toast.error(t('modals.transaction.error_category'));
        }

        setLoading(true);

        // Prepare payload
        const payload = {
            ...form,
            // Clear other mode's data
            counterparty_id: txMode === 'counterparty' ? form.counterparty_id : null,
            category_id: txMode === 'category' ? form.category_id : null
        };

        let success = false;

        if (editingTransaction) {
            success = await store.updateTransaction(editingTransaction.id, payload);
        } else {
            success = await store.addTransaction(payload);
        }

        setLoading(false);

        if (success) {
            onClose();
            toast.success(t('common.success'));
        }
    };

    const title = editingTransaction
        ? t('modals.transaction.title_edit')
        : (form.type === 'income' ? t('modals.transaction.title_income') : t('modals.transaction.title_expense'));

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US').format(amount);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                {/* Type Switcher */}
                <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                    <button
                        onClick={() => setForm(p => ({ ...p, type: 'expense', category_id: '', counterparty_id: '' }))}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${form.type === 'expense' ? 'bg-white shadow-sm text-error ring-1 ring-black/5' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {t('modals.transaction.type_expense')}
                    </button>
                    <button
                        onClick={() => setForm(p => ({ ...p, type: 'income', category_id: '', counterparty_id: '' }))}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${form.type === 'income' ? 'bg-white shadow-sm text-success ring-1 ring-black/5' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {t('modals.transaction.type_income')}
                    </button>
                </div>

                {/* Amount Input */}
                <div className="relative">
                    <input
                        type="number"
                        autoFocus={!editingTransaction}
                        className={`w-full text-4xl sm:text-5xl font-black p-4 bg-transparent border-b-2 outline-none text-center tabular-nums transition-colors ${form.type === 'expense' ? 'text-error border-error/30 focus:border-error' : 'text-success border-success/30 focus:border-success'}`}
                        value={form.amount}
                        onChange={e => setForm({ ...form, amount: e.target.value })}
                        placeholder="0"
                    />
                    <div className="text-center text-xs font-bold text-zinc-400 mt-2 uppercase tracking-wide">{t('modals.transaction.amount_label')} ({store.accounts.find(a => a.id === form.account_id)?.currency})</div>
                </div>

                <div className="space-y-4">
                    {/* Account Select */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase">{t('modals.transaction.account_label')}</label>
                        <select className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer" value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>
                            {store.accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(store.getAccountBalance(a.id))} {a.currency})</option>)}
                        </select>
                    </div>

                    {/* Category / Counterparty Select */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase">{form.type === 'expense' ? t('modals.transaction.category_counterparty_label_expense') : t('modals.transaction.category_counterparty_label_income')}</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setTxMode('category')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${txMode === 'category' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}>{t('modals.transaction.category')}</button>
                            <button onClick={() => setTxMode('counterparty')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${txMode === 'counterparty' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}>{t('modals.transaction.counterparty')}</button>
                        </div>

                        {txMode === 'category' ? (
                            <select className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                <option value="">{t('modals.transaction.select_category')}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                        ) : (
                            <select className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer" value={form.counterparty_id || ''} onChange={e => setForm({ ...form, counterparty_id: e.target.value })}>
                                <option value="">{t('modals.transaction.select_counterparty')}</option>
                                {store.counterparties.map(c => <option key={c.id} value={c.id}>{c.icon || '👤'} {c.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Date and Comment */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                            <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase">{t('modals.transaction.date_label')}</label>
                            <input type="date" className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase">{t('modals.transaction.comment_label')}</label>
                            <input type="text" placeholder="..." className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-indigo-500 transition-colors" value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
                        </div>
                    </div>

                    {/* AI Suggestion */}
                    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold uppercase text-zinc-500">{t('modals.transaction.ai_title')}</div>
                            <button
                                onClick={handleAiSuggest}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                disabled={aiLoading}
                            >
                                {aiLoading ? t('common.loading') : t('modals.transaction.ai_suggest')}
                            </button>
                        </div>
                        {aiSuggestion?.category && (
                            <button
                                className="w-full text-left text-sm font-bold text-zinc-700 bg-zinc-50 px-3 py-2 rounded-xl hover:bg-zinc-100"
                                onClick={() => {
                                    setTxMode('category');
                                    setForm(prev => ({ ...prev, category_id: aiSuggestion.category.id || prev.category_id }));
                                }}
                            >
                                {t('modals.transaction.ai_use_category')}: {aiSuggestion.category.name}
                            </button>
                        )}
                        {aiSuggestion?.counterparty && (
                            <button
                                className="w-full text-left text-sm font-bold text-zinc-700 bg-zinc-50 px-3 py-2 rounded-xl hover:bg-zinc-100"
                                onClick={() => {
                                    setTxMode('counterparty');
                                    setForm(prev => ({ ...prev, counterparty_id: aiSuggestion.counterparty.id || prev.counterparty_id }));
                                }}
                            >
                                {t('modals.transaction.ai_use_counterparty')}: {aiSuggestion.counterparty.name}
                            </button>
                        )}
                        {Array.isArray(aiSuggestion?.new_category_suggestions) && aiSuggestion.new_category_suggestions.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-bold uppercase text-zinc-400">{t('modals.transaction.ai_new_categories')}</div>
                                {aiSuggestion.new_category_suggestions.map((item, idx) => (
                                    <div key={`${item.name}-${idx}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                                            <span className="text-lg">{item.icon || '🧾'}</span>
                                            {item.name}
                                        </div>
                                        <button
                                            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100"
                                            onClick={() => store.createCategory(item.name, item.type || form.type, item.icon || '🧾', item.color)}
                                        >
                                            {t('modals.transaction.ai_create')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {aiSuggestion?.reason && (
                            <div className="text-xs text-zinc-500">{aiSuggestion.reason}</div>
                        )}
                    </div>
                </div>

                <Button onClick={handleSubmit} loading={loading} variant={form.type === 'expense' ? 'danger' : 'success'} className="w-full py-4 text-lg shadow-xl shadow-gray-200">
                    {editingTransaction ? t('modals.transaction.save_btn') : (form.type === 'expense' ? t('modals.transaction.expense_btn') : t('modals.transaction.income_btn'))}
                </Button>
            </div>
        </Modal>
    );
}
