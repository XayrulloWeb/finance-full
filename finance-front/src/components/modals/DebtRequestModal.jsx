import React, { useState, useEffect } from 'react';
import { X, Send, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTranslation } from 'react-i18next';

export default function DebtRequestModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const createDebtRequest = useFinanceStore(s => s.createDebtRequest);

    // State
    const [receiverEmail, setReceiverEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [debtType, setDebtType] = useState('owes_me'); // 'i_owe' | 'owes_me'
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setReceiverEmail('');
            setAmount('');
            setDebtType('owes_me');
            setName('');
            setNotes('');
            setDueDate('');
            setErrors({});
        }
    }, [isOpen]);

    const validate = () => {
        const newErrors = {};

        if (!receiverEmail || !receiverEmail.includes('@')) {
            newErrors.receiverEmail = 'Valid email is required';
        }

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (!name || name.trim().length === 0) {
            newErrors.name = 'Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        const result = await createDebtRequest({
            receiver_email: receiverEmail.trim(),
            amount: Number(amount),
            debt_type: debtType,
            name: name.trim(),
            notes: notes.trim() || undefined,
            due_date: dueDate || undefined
        });

        setLoading(false);

        if (result.success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('debt_requests.send_to_friend', 'Send Debt Request')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Receiver Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('debt_requests.receiver_email', "Friend's Email")} *
                        </label>
                        <input
                            type="email"
                            value={receiverEmail}
                            onChange={(e) => setReceiverEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${errors.receiverEmail
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                        />
                        {errors.receiverEmail && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.receiverEmail}
                            </p>
                        )}
                    </div>

                    {/* Debt Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('debt_requests.debt_type', 'Debt Type')} *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDebtType('owes_me')}
                                className={`px-4 py-3 rounded-lg border-2 transition-all ${debtType === 'owes_me'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-sm font-semibold">
                                    {t('debt_requests.debt_type_i_gave', 'I gave to friend')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">They owe me</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDebtType('i_owe')}
                                className={`px-4 py-3 rounded-lg border-2 transition-all ${debtType === 'i_owe'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-sm font-semibold">
                                    {t('debt_requests.debt_type_i_borrowed', 'I borrowed from friend')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">I owe them</div>
                            </button>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('common.amount', 'Amount')} *
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${errors.amount
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                        />
                        {errors.amount && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.amount}
                            </p>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('common.name', 'Name')} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Loan, Dinner, etc."
                            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${errors.name
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-indigo-500'
                                }`}
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('common.notes', 'Notes')} ({t('common.optional', 'Optional')})
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional details..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('common.due_date', 'Due Date')} ({t('common.optional', 'Optional')})
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Preview */}
                    {receiverEmail && amount && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <p className="text-sm text-indigo-900">
                                <strong>Preview:</strong> You will send a request to{' '}
                                <span className="font-semibold">{receiverEmail}</span> saying they{' '}
                                <span className="font-semibold">
                                    {debtType === 'owes_me' ? 'owe you' : 'lent you'}
                                </span>{' '}
                                <span className="font-semibold">{amount}</span>
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    {t('debt_requests.send_request', 'Send Request')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
