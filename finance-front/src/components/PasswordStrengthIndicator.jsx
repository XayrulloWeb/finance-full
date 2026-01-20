import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthIndicator({ password }) {
    const { t } = useTranslation();

    const requirements = [
        {
            key: 'length',
            test: password.length >= 8,
            label: t('auth.password_req_length')
        },
        {
            key: 'uppercase',
            test: /[A-Z]/.test(password),
            label: t('auth.password_req_uppercase')
        },
        {
            key: 'lowercase',
            test: /[a-z]/.test(password),
            label: t('auth.password_req_lowercase')
        },
        {
            key: 'number',
            test: /[0-9]/.test(password),
            label: t('auth.password_req_number')
        },
        {
            key: 'special',
            test: /[^A-Za-z0-9]/.test(password),
            label: t('auth.password_req_special')
        }
    ];

    const passedCount = requirements.filter(r => r.test).length;
    const strength = passedCount <= 2 ? 'weak' : passedCount <= 4 ? 'medium' : 'strong';

    const strengthColors = {
        weak: 'text-red-600 bg-red-100',
        medium: 'text-amber-600 bg-amber-100',
        strong: 'text-green-600 bg-green-100'
    };

    const strengthLabels = {
        weak: t('auth.password_weak'),
        medium: t('auth.password_medium'),
        strong: t('auth.password_strong')
    };

    if (!password) return null;

    return (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            {/* Strength Level */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                    {t('auth.password_strength')}:
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${strengthColors[strength]}`}>
                    {strengthLabels[strength]}
                </span>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                    {t('auth.password_requires')}
                </p>
                {requirements.map(req => (
                    <div key={req.key} className="flex items-center gap-2 text-xs">
                        {req.test ? (
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                            <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className={req.test ? 'text-green-700 font-medium' : 'text-slate-500'}>
                            {req.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${strength === 'weak' ? 'bg-red-500 w-1/3' :
                            strength === 'medium' ? 'bg-amber-500 w-2/3' :
                                'bg-green-500 w-full'
                        }`}
                />
            </div>
        </div>
    );
}
