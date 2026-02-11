import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../store/useFinanceStore';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Loader, ChevronLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS, uz } from 'date-fns/locale';
import Button from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export default function Notifications() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const {
        notifications,
        markNotificationRead,
        clearAllNotifications,
        fetchNotifications,
        isLoadingNotifications,
        hasMoreNotifications,
        notificationPage
    } = useFinanceStore();

    const locales = { ru, en: enUS, uz };
    const currentLocale = locales[i18n.language] || ru;

    // Group notifications
    const grouped = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).reduce((acc, n) => {
        const date = new Date(n.created_at);
        let key = 'earlier';
        if (isToday(date)) key = 'today';
        else if (isYesterday(date)) key = 'yesterday';

        if (!acc[key]) acc[key] = [];
        acc[key].push(n);
        return acc;
    }, {});

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="text-warning" />;
            case 'success': return <CheckCircle className="text-success" />;
            case 'error': return <Trash2 className="text-error" />;
            default: return <Info className="text-primary" />;
        }
    };

    // Helper to get translated group title
    const getGroupTitle = (key) => {
        switch (key) {
            case 'today': return t('notifications.today');
            case 'yesterday': return t('notifications.yesterday');
            default: return t('notifications.earlier');
        }
    };

    // Sort order for display: today, yesterday, earlier
    const sortKeys = (keys) => {
        const order = ['today', 'yesterday', 'earlier'];
        return keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    };

    // Infinite Scroll
    const loadMore = () => {
        fetchNotifications({ page: notificationPage + 1, limit: 20, append: true });
    };

    const lastElementRef = useInfiniteScroll(loadMore, hasMoreNotifications, isLoadingNotifications);

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-36 sm:pb-40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft strokeWidth={3} />
                        </button>
                        <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Bell strokeWidth={2.5} /></span>
                        {t('notifications.title')}
                    </h1>
                    <p className="text-zinc-500 mt-1">{t('notifications.subtitle')}</p>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <Button onClick={clearAllNotifications} size="sm" variant="ghost" icon={Check} className="w-full sm:w-auto">
                        {t('notifications.read_all')}
                    </Button>
                )}
            </div>

            {Object.keys(grouped).length === 0 && !isLoadingNotifications && (
                <div className="text-center py-20 flex flex-col items-center justify-center animate-fade-in group">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Bell size={40} className="text-indigo-300 dark:text-indigo-400/50" strokeWidth={1.5} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('notifications.empty')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto text-sm leading-relaxed">
                        {t('notifications.subtitle')}
                    </p>
                </div>
            )}

            {sortKeys(Object.keys(grouped)).map(groupKey => (
                <div key={groupKey}>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3 ml-1">{getGroupTitle(groupKey)}</h3>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {grouped[groupKey].map((n) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div
                                        className={`relative p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-white border-zinc-100' : 'bg-white border-zinc-200 shadow-md shadow-indigo-500/5'}`}
                                        onClick={() => markNotificationRead(n.id)}
                                    >
                                        {!n.is_read && (
                                            <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                        )}
                                        <div className="flex gap-4 items-start">
                                            <div className={`mt-1 p-2 rounded-xl bg-zinc-50 border border-zinc-100`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-bold ${n.is_read ? 'text-zinc-500' : 'text-zinc-900'}`}>
                                                    {n.title}
                                                </div>
                                                <div className="text-sm text-zinc-500 mt-1 leading-relaxed">
                                                    {n.message}
                                                </div>
                                                <div className="text-xs text-zinc-400 mt-2">
                                                    {format(new Date(n.created_at), 'HH:mm', { locale: currentLocale })} • {groupKey === 'today' ? format(new Date(n.created_at), 'd MMMM', { locale: currentLocale }) : format(new Date(n.created_at), 'd MMM yyyy', { locale: currentLocale })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ))}

            {/* Infinite Scroll Loader */}
            <div ref={lastElementRef} className="py-6 flex justify-center w-full min-h-[50px]">
                {isLoadingNotifications && <Loader className="animate-spin text-indigo-500" size={24} />}
            </div>
        </div>
    );
}
