import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { useFinanceStore } from '../store/useFinanceStore';
import { toast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Lock, Eye, EyeOff, ChevronRight, Wallet, KeyRound, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Auth() {
    const { t } = useTranslation();

    // Данные формы
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState(''); // <-- Для кода подтверждения
    const [phone, setPhone] = useState(''); // <-- Если захочешь добавить телефон позже
    const [authMethod, setAuthMethod] = useState('email'); // email | phone
    const navigate = useNavigate();
    const [resendCountdown, setResendCountdown] = useState(0);
    // Состояния UI
    const [showPassword, setShowPassword] = useState(false);
    const [isReg, setIsReg] = useState(false); // false = Login, true = Register
    const [step, setStep] = useState(1); // 1 = Form, 2 = Code Verification
    const [loading, setLoading] = useState(false);
    const isPhone = authMethod === 'phone';
    const contactValue = (isPhone ? phone : email) || t('auth.contact_fallback');
    const handleContactChange = (value) => {
        if (isPhone) {
            const cleaned = value.replace(/[^\\d+]/g, '');
            const normalized = cleaned.startsWith('+')
                ? '+' + cleaned.slice(1).replace(/\\+/g, '')
                : cleaned.replace(/\\+/g, '');
            setPhone(normalized);
            return;
        }
        setEmail(value);
    };

    const checkUser = useFinanceStore(s => s.checkUser);

    // Функция завершения входа
    const finalizeLogin = async (token) => {
        localStorage.setItem('token', token);
        await checkUser();
        toast.success(t('auth.welcome_back'));
    };
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCountdown]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // --- ЛОГИКА РЕГИСТРАЦИИ ---
            if (isReg) {
                if (step === 1) {
                    // ШАГ 1: Отправляем данные, ждем отправки кода
                    await api.post('/auth/register', {
                        email: isPhone ? undefined : email,
                        phone: isPhone ? phone : undefined,
                        password
                    });
                    setStep(2); // Переходим к вводу кода
                    toast.success(isPhone ? t('auth.check_phone') : t('auth.check_email'));
                } else {
                    // ШАГ 2: Проверяем код
                    const response = await api.post('/auth/verify', {
                        email: isPhone ? undefined : email,
                        phone: isPhone ? phone : undefined,
                        code
                    });
                    await finalizeLogin(response.data.token);
                }
            }
            // --- ЛОГИКА ВХОДА ---
            else {
                const response = await api.post('/auth/login', {
                    email: isPhone ? undefined : email,
                    phone: isPhone ? phone : undefined,
                    password
                });
                await finalizeLogin(response.data.token);
            }

        } catch (err) {
            console.error("Auth error:", err);

            const data = err.response?.data;
            let msg = data?.error || data?.message || "Ошибка соединения";

            if (data?.errors && Array.isArray(data.errors)) {
                msg = data.errors.map(e => e.message).join('. ');
            }

            // Спец. обработка: Если при логине сервер сказал, что нужна верификация
            if (!isReg && data?.needVerification) {
                toast.error(t('auth.need_verification'));
                if (data.phone) setPhone(data.phone);
                if (data.email) setEmail(data.email);
                setAuthMethod(data.phone ? 'phone' : 'email');
                setIsReg(true);
                setStep(2);
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // Сброс шагов при переключении Вход <-> Регистрация
    const toggleMode = () => {
        setIsReg(!isReg);
        setStep(1);
        setCode('');
    };

    const handleResendCode = async () => {
        try {
            const data = authMethod === 'email' ? { email: email.trim() } : { phone: phone.trim() };
            await api.post('/auth/resend-verification', data);
            toast.success(t('auth.code_resent'));
            setResendCountdown(60);
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Ошибка');
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col justify-center p-4 sm:p-6 relative overflow-hidden bg-[#f6f1e9]">
            {/* Декоративные мягкие блики */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[40%] bg-teal-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[30%] bg-amber-100/40 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="w-full max-w-sm sm:max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-zinc-900/10"
            >
                {/* Логотип */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-white shadow-xl rounded-[20px] flex items-center justify-center mb-6 border border-white">
                        <Wallet className="w-8 h-8 text-teal-700" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-center font-black text-2xl text-slate-900">Finance Empire</h1>
                    <p className="mt-2 text-slate-600 font-medium text-center text-sm">
                        {step === 2
                            ? t('auth.code_sent_to', { target: contactValue })
                            : (isReg ? t('auth.create_capital') : t('auth.assets_control'))}
                    </p>
                </div>

                {/* Форма с анимацией смены контента */}
                <form onSubmit={handleAuth} className="space-y-6 mt-4 relative">
                    <AnimatePresence mode="wait">

                        {/* ШАГ 1: Email и Пароль */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Поле Email */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-white/70 border border-slate-200/80 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setAuthMethod('email')}
                                            className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${!isPhone ? 'bg-teal-700 text-white shadow-md shadow-teal-700/30' : 'text-slate-600 hover:bg-teal-50'}`}
                                        >
                                            {t('auth.method_email')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAuthMethod('phone')}
                                            className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${isPhone ? 'bg-teal-700 text-white shadow-md shadow-teal-700/30' : 'text-slate-600 hover:bg-teal-50'}`}
                                        >
                                            {t('auth.method_phone')}
                                        </button>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            {isPhone ? t('auth.phone_label') : t('auth.email_label')}
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                                {isPhone
                                                    ? <Phone className="w-5 h-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                                                    : <Mail className="w-5 h-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                                                }
                                            </div>
                                            <input
                                                type={isPhone ? "tel" : "email"}
                                                placeholder={isPhone ? t('auth.phone_placeholder') : t('auth.email_placeholder')}
                                                value={isPhone ? phone : email}
                                                onChange={e => handleContactChange(e.target.value)}
                                                required
                                                className="!pl-12 w-full py-4 bg-white border border-slate-200/80 rounded-xl outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Поле Пароль */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        {t('auth.password_label')}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                            <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="********"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            className="!pl-12 !pr-12 w-full py-4 bg-white border border-slate-200/80 rounded-xl outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        />


                                        {!isReg && (
                                            <div className="text-right ">
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
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-700 transition-colors z-10"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                {isReg && <PasswordStrengthIndicator password={password} />}
                            </motion.div>
                        )}

                        {/* ШАГ 2: Код подтверждения */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        {t('auth.code_label')}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                            <KeyRound className="w-5 h-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="123456"
                                            value={code}
                                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            autoFocus
                                            className="!pl-12 w-full py-4 bg-white border border-slate-200/80 rounded-xl outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all text-2xl font-black tracking-widest text-center text-slate-900 placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="text-center mt-2">
                                        <div className="text-center mb-4">
                                            <button
                                                type="button"
                                                onClick={handleResendCode}
                                                disabled={resendCountdown > 0}
                                                className="text-sm text-teal-600 hover:text-teal-700 hover:underline disabled:text-gray-400 disabled:no-underline transition"
                                            >
                                                {resendCountdown > 0
                                                    ? t('auth.resend_wait', { seconds: resendCountdown })
                                                    : t('auth.resend_code')
                                                }
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <ArrowLeft size={12} /> {t('auth.back_to_method', { method: isPhone ? t('auth.method_phone') : t('auth.method_email') })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                    {/* Кнопка действия */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-lg shadow-teal-700/25 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {step === 1
                                    ? (isReg ? t('auth.create_account_btn') : t('auth.login_btn'))
                                    : t('auth.confirm_code_btn')
                                }
                                <ChevronRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Футер: Переключатель Вход/Регистрация (только на 1 шаге) */}
                {step === 1 && (
                    <div className="mt-10 text-center">
                        <p className="text-slate-600 font-medium">
                            {isReg ? t('auth.already_member') : t('auth.new_member')}
                        </p>
                        <button
                            onClick={toggleMode}
                            className="mt-2 text-slate-900 font-bold text-lg hover:text-teal-700 transition-colors inline-flex items-center gap-1"
                        >
                            {isReg ? t('auth.login_link') : t('auth.create_profile_link')}
                        </button>
                    </div>
                )}

                <p className="text-center mt-12 text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
                    (C) 2025 FINANCE EMPIRE PLATINUM
                </p>
            </motion.div>
        </div>
    );
}








