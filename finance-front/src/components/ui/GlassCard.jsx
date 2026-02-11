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
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.92) 40%, rgba(109, 40, 217, 0.88) 100%)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 20px 50px -10px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    } : {};

    const baseClasses = `
        ${gradient ? 'text-white rounded-[28px]' : 'glass-panel text-zinc-900 dark:text-zinc-100'}
        relative overflow-hidden p-5 sm:p-6
    `;

    const hoverClasses = hover ? 'transition-all duration-300' : '';

    const Component = onClick ? motion.button : motion.div;

    return (
        <Component
            className={`${baseClasses} ${hoverClasses} ${className}`}
            style={glassStyle}
            onClick={onClick}
            whileHover={hover ? { scale: 1.01 } : {}}
            whileTap={onClick ? { scale: 0.98 } : {}}
            {...props}
        >
            {gradient && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
                    <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-300/15 rounded-full blur-3xl" />
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </Component>
    );
}
