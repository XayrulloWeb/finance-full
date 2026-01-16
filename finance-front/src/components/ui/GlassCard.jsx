import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({
    children,
    className = '',
    gradient = false,
    hover = true,
    onClick,
    ...props
}) {
    const glassStyle = gradient ? {
        background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.95) 0%, rgba(20, 184, 166, 0.95) 60%, rgba(251, 146, 60, 0.9) 120%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 20px 40px -10px rgba(15, 118, 110, 0.35)',
    } : {
        background: 'rgba(255, 255, 255, 0.86)', // Чуть более прозрачный для эффекта
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.9)', // Более явная "керамическая" граница
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.08)',
    };

    const baseClasses = `
        glass-card ${gradient ? 'glass-card--gradient' : 'glass-card--standard'}
        relative overflow-hidden rounded-3xl p-5 sm:p-6
        ${gradient ? 'text-white' : 'text-zinc-900'}
    `;

    const hoverClasses = hover ? 'transition-all duration-300 hover:shadow-2xl hover:-translate-y-1' : '';

    const Component = onClick ? motion.button : motion.div;

    return (
        <Component
            className={`${baseClasses} ${hoverClasses} ${className}`}
            style={glassStyle}
            onClick={onClick}
            whileHover={hover ? { scale: 1.02 } : {}}
            whileTap={onClick ? { scale: 0.98 } : {}}
            {...props}
        >
            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </Component>
    );
}

