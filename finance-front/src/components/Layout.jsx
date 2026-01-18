import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ChartPie, History, Handshake, Target, Receipt, Calendar, Bell, Users, Settings, Wallet, LogOut, Menu, X, Plus, Shield } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceStore } from '../store/useFinanceStore';
import { toast } from './ui/Toast';
import InstallPwa from './ui/InstallPwa';
import Modal from './ui/Modal';
import Button from './ui/Button';
import AccountModal from './modals/AccountModal';
import TransactionModal from './modals/TransactionModal';
import TransferModal from './modals/TransferModal';
import { ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslation } from 'react-i18next'; // Import hook

export default function Layout() {
  const { t } = useTranslation(); // Init hook
  const user = useFinanceStore(s => s.user);
  const logout = useFinanceStore(s => s.logout);
  const unreadCount = useFinanceStore(s => s.unreadCount);
  const fetchUnreadCount = useFinanceStore(s => s.fetchUnreadCount);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = React.useState(false);

  // Polling for notifications (every 30s)
  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Global Modals State
  const activeModal = useFinanceStore(s => s.activeModal);
  const modalProps = useFinanceStore(s => s.modalProps);
  const closeModal = useFinanceStore(s => s.closeModal);
  const openModal = useFinanceStore(s => s.openModal);

  const handleLogout = async () => {
    await logout();
    toast.success(t('common.loading')); // Using loading/logout message
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: "/analytics", icon: ChartPie, label: t('nav.analytics') },
    { to: "/history", icon: History, label: t('nav.history') },
    { to: "/debts", icon: Handshake, label: t('nav.debts') },
    { to: "/goals", icon: Target, label: t('nav.goals') },
    { to: "/recurring", icon: Receipt, label: t('nav.recurring') },
    { to: "/calendar", icon: Calendar, label: t('nav.calendar') },
    { to: "/notifications", icon: Bell, label: t('notifications.title') },
    { to: "/counterparties", icon: Users, label: t('nav.counterparties') },
    { to: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: "/admin", icon: Shield, label: t('nav.admin') });
  }

  const mobileLinkClass = ({ isActive }) =>
    `relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
    ${isActive
      ? 'text-white bg-teal-700 shadow-lg shadow-teal-700/40 scale-110'
      : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
    } `;

  return (
    <div className="flex h-screen overflow-hidden text-zinc-900 font-sans bg-canvas transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden lg:flex flex-col w-80 h-full z-30 transition-colors duration-300">
        <div className="flex items-center gap-3 px-8 py-8">
          <div className="p-3 bg-gradient-to-tr from-teal-700 to-amber-500 rounded-2xl shadow-xl shadow-teal-700/30">
            <Wallet className="text-white" size={28} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 leading-none tracking-tight">Finance</h1>
            <span className="text-[10px] font-bold text-teal-700 tracking-[0.2em] uppercase">Empire</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-4 mx-2 rounded-2xl transition-all duration-300 font-bold group
               ${isActive
                ? 'bg-surface shadow-xl shadow-teal-700/10 text-teal-700 translate-x-2'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-surface/50 hover:pl-8'
              } `
            }>
              <item.icon size={22} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold tracking-wide">{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg shadow-rose-500/30">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 font-bold transition-all"
          >
            <LogOut size={20} strokeWidth={2.5} />
            <span>{t('common.cancel')}</span> {/* Using cancel as closest to logout or add logout key */}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto scroll-smooth custom-scrollbar relative">
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32">
          <Outlet />
        </div>
      </main>

      {/* --- MASTERPIECE MOBILE NAVIGATION (Floating Island) --- */}
      <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[350px] px-4 pb-safe">
        <nav className="relative flex items-center justify-between px-6 py-4 rounded-[2.5rem] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl shadow-zinc-900/20 ring-1 ring-black/5 dark:ring-white/5">

          <NavLink to="/" className={({ isActive }) => `relative z-10 p-2 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={24} strokeWidth={2.5} />
                {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 dark:bg-teal-400 rounded-full" />}
              </>
            )}
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `relative z-10 p-2 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {({ isActive }) => (
              <>
                <ChartPie size={24} strokeWidth={2.5} />
                {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 dark:bg-teal-400 rounded-full" />}
              </>
            )}
          </NavLink>

          {/* CENTRAL ACTION BUTTON (Breakout) */}
          <div className="relative -mt-12 z-20">
            {/* Decorative Ring/Background to blend with bar if needed, or standalone */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-8 bg-transparent rounded-full box-content" />

            <AnimatePresence>
              {isActionMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: -10 }}
                  exit={{ opacity: 0, scale: 0.5, y: 30 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-2 items-center"
                >
                  <button onClick={() => { openModal('transaction', { initialType: 'income' }); setIsActionMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 font-bold text-sm whitespace-nowrap">
                    <TrendingUp size={18} /> {t('dashboard.monthly_income')}
                  </button>
                  <button onClick={() => { openModal('transaction', { initialType: 'expense' }); setIsActionMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/30 font-bold text-sm whitespace-nowrap">
                    <TrendingDown size={18} /> {t('dashboard.monthly_expense')}
                  </button>
                  <button onClick={() => { openModal('transfer'); setIsActionMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30 font-bold text-sm whitespace-nowrap">
                    <ArrowRightLeft size={18} /> Transfer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className={`flex items-center justify-center w-16 h-16 rounded-[1.2rem] shadow-xl shadow-teal-600/30 text-white transition-all duration-300 border-[4px] border-white dark:border-zinc-900 ${isActionMenuOpen ? 'bg-zinc-800 rotate-45' : 'bg-teal-600 rotate-0'}`}
            >
              <Plus size={32} strokeWidth={3} />
            </motion.button>
          </div>

          <NavLink to="/history" className={({ isActive }) => `relative z-10 p-2 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {({ isActive }) => (
              <>
                <History size={24} strokeWidth={2.5} />
                {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 dark:bg-teal-400 rounded-full" />}
              </>
            )}
          </NavLink>

          <button onClick={() => setIsMobileMenuOpen(true)} className={`relative z-10 p-2 transition-colors ${isMobileMenuOpen ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
            <Menu size={24} strokeWidth={2.5} />
          </button>
        </nav>
      </div>

      {/* --- MASTERPIECE DATA OVERLAY (Mobile Menu) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}

            className="fixed inset-0 z-[60] lg:hidden bg-canvas/95 backdrop-blur-3xl flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 mt-safe">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30">
                  <span className="font-black text-lg">{user?.email?.[0].toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 leading-none">Меню</h2>
                  <p className="text-xs text-zinc-500 font-bold mt-1">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-12 h-12 rounded-full bg-white shadow-lg shadow-zinc-200/50 flex items-center justify-center text-zinc-900 border border-zinc-100 active:scale-90 transition-transform"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Grid Links */}
            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-3 p-6 rounded-3xl transition-all duration-300 border h-32
                       ${isActive
                        ? 'bg-teal-700 text-white border-teal-600 shadow-xl shadow-teal-700/30'
                        : 'bg-white text-zinc-500 border-zinc-100 shadow-sm hover:shadow-md'
                      }`
                    }
                  >
                    <item.icon size={32} strokeWidth={2} className="mb-1" />
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-6 mb-8 flex items-center justify-center gap-3 p-5 rounded-3xl bg-rose-50 text-rose-600 font-black border border-rose-100 shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
              >
                <LogOut size={24} strokeWidth={2.5} />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <InstallPwa />

      {/* GLOBAL MODALS */}
      <AccountModal
        isOpen={activeModal === 'account'}
        onClose={closeModal}
      />
      <TransactionModal
        isOpen={activeModal === 'transaction'}
        onClose={closeModal}
        {...modalProps}
      />
      <TransferModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
      />
    </div>
  );
}
