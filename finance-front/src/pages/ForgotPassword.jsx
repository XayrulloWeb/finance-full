import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/Toast';
import api from '../api/axios';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword({ onBackToLogin }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error(t('auth.email_required'));
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/request-password-reset', { email: email.trim() });
            setEmailSent(true);
        } catch (err) {
            console.error('Password reset request error:', err);
            // Даже при ошибке показываем success (против enumeration)
            setEmailSent(true);
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {t('auth.check_email')}
                        </h2>
                        <p className="text-gray-600">
                            {t('auth.reset_link_sent')}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {email}
                        </p>
                    </div>

                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
                    >
                        {t('auth.back_to_login')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <button
                    onClick={onBackToLogin}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t('auth.back')}
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {t('auth.forgot_password')}
                    </h1>
                    <p className="text-gray-600">
                        {t('auth.reset_instructions')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('auth.email')}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('auth.email_placeholder')}
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('common.loading') : t('auth.send_reset_link')}
                    </button>
                </form>
            </div>
        </div>
    );
}
