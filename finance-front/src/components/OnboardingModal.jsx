import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, PiggyBank, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { toast } from './ui/Toast';
import { useTranslation } from 'react-i18next';

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'];

export default function OnboardingModal({ isOpen, onComplete }) {
    const { t } = useTranslation();
    const createAccount = useFinanceStore(s => s.createAccount);

    const [step, setStep] = useState(1); // 1 = welcome, 2 = create account
    const [isLoading, setIsLoading] = useState(false);

    // Account presets with translations
    const ACCOUNT_PRESETS = [
        { icon: '💳', nameKey: 'onboarding.preset_card', currency: 'UZS', color: '#10b981' },
        { icon: '💵', nameKey: 'onboarding.preset_cash', currency: 'UZS', color: '#6366f1' },
        { icon: '💰', nameKey: 'onboarding.preset_savings', currency: 'UZS', color: '#f59e0b' },
        { icon: '🏦', nameKey: 'onboarding.preset_deposit', currency: 'USD', color: '#3b82f6' },
    ];

    // Account form state
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [accountName, setAccountName] = useState('');
    const [accountIcon, setAccountIcon] = useState('💳');
    const [accountCurrency, setAccountCurrency] = useState('UZS');
    const [initialBalance, setInitialBalance] = useState('');
    const [accountColor, setAccountColor] = useState('#10b981');

    const handlePresetSelect = (preset) => {
        setSelectedPreset(preset);
        setAccountName(t(preset.nameKey));
        setAccountIcon(preset.icon);
        setAccountCurrency(preset.currency);
        setAccountColor(preset.color);
    };

    const handleCreateAccount = async () => {
        if (!accountName.trim()) {
            toast.error(t('modals.account.name_placeholder'));
            return;
        }

        setIsLoading(true);
        try {
            // createAccount signature: (name, currency, color, icon, initialBalance)
            const result = await createAccount(
                accountName.trim(),
                accountCurrency,
                accountColor,
                accountIcon,
                parseFloat(initialBalance) || 0
            );

            if (result !== false) {
                toast.success(t('toasts.acc_created'));
                onComplete?.();
            }
        } catch (error) {
            console.error('Error creating account:', error);
            toast.error(t('toasts.acc_create_error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="p-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/30"
                            >
                                <Sparkles className="text-white" size={48} />
                            </motion.div>

                            <h1 className="text-3xl font-black text-zinc-900 mb-3">
                                {t('onboarding.welcome_title')}
                            </h1>
                            <p className="text-zinc-500 font-medium mb-8 text-lg">
                                {t('onboarding.welcome_desc')}
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all flex items-center justify-center gap-3 text-lg"
                                >
                                    <Wallet size={24} />
                                    {t('onboarding.create_first_account')}
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Create Account */}
                    {step === 2 && (
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-zinc-900">{t('modals.account.title')}</h2>
                                    <p className="text-sm text-zinc-500 font-medium">{t('onboarding.account_subtitle')}</p>
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {ACCOUNT_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handlePresetSelect(preset)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedPreset === preset
                                            ? 'border-teal-500 bg-teal-50 shadow-lg'
                                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{preset.icon}</span>
                                            <div>
                                                <div className="font-bold text-zinc-900 text-sm">{t(preset.nameKey)}</div>
                                                <div className="text-xs text-zinc-500">{preset.currency}</div>
                                            </div>
                                            {selectedPreset === preset && (
                                                <Check className="ml-auto text-teal-500" size={20} />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Form */}
                            <div className="space-y-4">
                                {/* Icon + Name */}
                                <div className="flex gap-3">
                                    <div className="w-16">
                                        <label className="block text-xs font-bold text-zinc-500 mb-2">{t('modals.account.icon_label')}</label>
                                        <input
                                            type="text"
                                            value={accountIcon}
                                            onChange={(e) => setAccountIcon(e.target.value)}
                                            className="w-full h-12 text-center text-2xl bg-zinc-100 rounded-xl border-2 border-zinc-200 focus:border-teal-500 focus:ring-0 transition-colors"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-zinc-500 mb-2">{t('modals.account.name_label')}</label>
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            placeholder={t('modals.account.name_placeholder')}
                                            className="w-full h-12 px-4 bg-zinc-100 rounded-xl border-2 border-zinc-200 focus:border-teal-500 focus:ring-0 font-medium transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Currency + Balance */}
                                <div className="flex gap-3">
                                    <div className="w-1/3">
                                        <label className="block text-xs font-bold text-zinc-500 mb-2">{t('modals.account.currency_label')}</label>
                                        <select
                                            value={accountCurrency}
                                            onChange={(e) => setAccountCurrency(e.target.value)}
                                            className="w-full h-12 px-4 bg-zinc-100 rounded-xl border-2 border-zinc-200 focus:border-teal-500 focus:ring-0 font-bold transition-colors"
                                        >
                                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-zinc-500 mb-2">{t('modals.account.initial_balance')}</label>
                                        <input
                                            type="number"
                                            value={initialBalance}
                                            onChange={(e) => setInitialBalance(e.target.value)}
                                            placeholder="0"
                                            className="w-full h-12 px-4 bg-zinc-100 rounded-xl border-2 border-zinc-200 focus:border-teal-500 focus:ring-0 font-bold transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-2">{t('modals.account.color_label')}</label>
                                    <div className="flex gap-2">
                                        {['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setAccountColor(color)}
                                                className={`w-10 h-10 rounded-xl transition-all ${accountColor === color ? 'ring-4 ring-offset-2 ring-zinc-300 scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleCreateAccount}
                                disabled={isLoading || !accountName.trim()}
                                className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                                ) : (
                                    <>
                                        <Check size={24} />
                                        {t('modals.account.create_btn')}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full mt-3 py-3 text-zinc-500 font-medium hover:text-zinc-700 transition-colors"
                            >
                                ← {t('onboarding.back')}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
