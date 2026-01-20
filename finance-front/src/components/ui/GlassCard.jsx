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
    // Style only used for gradient cards now, standard cards use Tailwind classes
    const glassStyle = gradient ? {
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 60%, rgba(236, 72, 153, 0.9) 120%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 20px 40px -10px rgba(139, 92, 246, 0.35)',
    } : {};

    const baseClasses = `
        ${gradient ? 'glass-card--gradient text-white' : 'glass-panel text-zinc-900 dark:text-zinc-100'}
        relative overflow-hidden p-5 sm:p-6
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

