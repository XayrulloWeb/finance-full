import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../store/useFinanceStore';
import { toast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Lock, Eye, EyeOff, ChevronRight, Wallet, KeyRound, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Auth() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isReg, setIsReg] = useState(false);
    const [method, setMethod] = useState('email');
    const [step, setStep] = useState('input');
    
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const login = useFinanceStore((s) => s.login);
    const register = useFinanceStore((s) => s.register);
    const verifyCode = useFinanceStore((s) => s.verifyCode);

    const currentContact = method === 'email' ? email : phone;

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = method === 'email'
                ? { email: email.trim(), password }
                : { phone: phone.trim(), password };

            if (isReg) {
                const res = await register(data);
                if (res.redirect === 'verify') {
                    setStep('verify');
                    toast.success(t('auth.check_email'));
                }
            } else {
                await login(data);
            }
        } catch (err) {
            console.error('Auth error:', err);
            if (err?.needVerification) {
                setStep('verify');
                toast.error(t('auth.need_verification'));
            } else {
                toast.error(err?.message || 'Ошибка авторизации');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!code || code.length !== 6) {
            toast.error('Введите 6-значный код');
            return;
        }
        setLoading(true);
        try {
            const data = method === 'email'
                ? { email: email.trim(), code }
                : { phone: phone.trim(), code };
            await verifyCode(data);
            toast.success('Аккаунт подтвержден!');
        } catch (err) {
            console.error('Verify error:', err);
            toast.error(err?.message || 'Неверный код');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsReg(!isReg);
        setStep('input');
        setCode('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Wallet className="w-8 h-8 text-teal-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Finance Empire</h1>
                    <p className="text-slate-600">{t('auth.assets_control')}</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-8">
                    <AnimatePresence mode="wait">
                        {step === 'input' ? (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                                    <button
                                        onClick={() => setMethod('email')}
                                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                                            method === 'email'
                                                ? 'bg-teal-600 text-white shadow-md'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        EMAIL
                                    </button>
                                    <button
                                        onClick={() => setMethod('phone')}
                                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                                            method === 'phone'
                                                ? 'bg-teal-600 text-white shadow-md'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {t('auth.method_phone').toUpperCase()}
                                    </button>
                                </div>

                                <form onSubmit={handleAuth} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            {method === 'email' ? t('auth.email_label') : t('auth.phone_label')}
                                        </label>
                                        <div className="relative group">
                                            {method === 'email' ? (
                                                <>
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder={t('auth.email_placeholder')}
                                                        required
                                                        className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors"  />
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder={t('auth.phone_placeholder')}
                                                        required
                                                        className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            {t('auth.password_label')}
                                        </label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full pl-12 pr-12 py-3.5 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isReg && (
                                        <div className="text-right -mt-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate('/forgot-password')}
                                                className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline transition"
                                            >
                                                {t('auth.forgot_password')}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {isReg ? t('auth.create_account_btn') : t('auth.login_btn')}
                                                <ChevronRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>

                                    <div className="text-center pt-4 border-t border-slate-200">
                                        <p className="text-slate-600 text-sm">
                                            {isReg ? t('auth.already_member') : t('auth.new_member')}
                                            {' '}
                                            <button
                                                type="button"
                                                onClick={toggleMode}
                                                className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition"
                                            >
                                                {isReg ? t('auth.login_link') : t('auth.create_profile_link')}
                                            </button>
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <button
                                    onClick={() => setStep('input')}
                                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('auth.back_to_method', { method: method === 'email' ? 'Email' : t('auth.method_phone') })}
                                </button>

                                <div className="text-center mb-6">
                                    <KeyRound className="w-16 h-16 text-teal-600 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                        {method === 'email' ? t('auth.check_email') : t('auth.check_phone')}
                                    </h2>
                                    <p className="text-slate-600">
                                        {t('auth.code_sent_to', { target: currentContact || t('auth.contact_fallback') })}
                                    </p>
                                </div>

                                <form onSubmit={handleVerify} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            {t('auth.code_label')}
                                        </label>
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none text-center text-2xl tracking-widest font-mono"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || code.length !== 6}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                        ) : (
                                            t('auth.confirm_code_btn')
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6">
                    (C) 2025 FINANCE EMPIRE PLATINUM
                </p>
            </motion.div>
        </div>
    );
}
