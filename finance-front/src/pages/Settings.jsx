import React, { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Trash2, Plus, LogOut, User, Wallet, Tag, Shield, Download, Upload, Globe, ChevronRight, Zap, RefreshCw, Sparkles, Bell } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/ui/Toast';
import { subscribeToPush } from '../lib/push';

// Imported Modals
import AccountModal from '../components/modals/AccountModal';
import ImportModal from '../components/modals/ImportModal';

import { useTranslation } from 'react-i18next'; // Import hook

const EMOJI_OPTIONS = [
  '\u{1F354}',
  '\u{1F355}',
  '\u{1F37A}',
  '\u2615',
  '\u{1F6D2}',
  '\u{1F6CD}\u{FE0F}',
  '\u{1F381}',
  '\u{1F48A}',
  '\u{1FA78}',
  '\u{1F393}',
  '\u{1F4DA}',
  '\u{1F4BC}',
  '\u{1F4B8}',
  '\u{1F4B0}',
  '\u{1F4B3}',
  '\u{1F3E0}',
  '\u{1F4A1}',
  '\u{1F6BF}',
  '\u{1F695}',
  '\u2708\u{FE0F}',
  '\u{1F3AE}',
  '\u{1F3AC}',
  '\u{1F3B5}',
  '\u{1F4AA}',
  '\u26BD',
  '\u{1F487}',
  '\u{1F485}',
  '\u{1F476}',
  '\u{1F43E}',
  '\u{1F436}',
  '\u{1F431}',
  '\u{1F6E0}\u{FE0F}',
  '\u{1F527}',
  '\u{1F9F9}',
  '\u{1F4C5}',
  '\u{1F514}',
  '\u26A0\u{FE0F}',
  '\u{1F525}',
  '\u2764\u{FE0F}',
  '\u2728',
  '\u{1F966}',
  '\u{1F34E}',
  '\u{1F68D}',
  '\u{1F6B2}',
  '\u{1F3E5}',
  '\u{1F457}',
  '\u{1F45F}',
  '\u{1F3A9}',
  '\u{1F453}',
  '\u{1F48D}',
  '\u{1F4F7}',
  '\u{1F4F9}',
  '\u{1F4DE}',
  '\u{1F50B}',
  '\u{1F50C}'
];

export default function Settings() {
  const store = useFinanceStore();
  const fetchAiCategorySuggestions = useFinanceStore(s => s.fetchAiCategorySuggestions);
  const aiCategorySuggestions = useFinanceStore(s => s.aiCategorySuggestions);
  const isAiCategoriesLoading = useFinanceStore(s => s.isAiCategoriesLoading);
  const { t, i18n } = useTranslation(); // Init hook

  // Tabs State
  const [activeTab, setActiveTab] = useState('general'); // general, accounts, categories, data

  // Modals State
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Forms State
  const [currencyForm, setCurrencyForm] = useState(store.settings.currency_rates);

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState('\u{1F4CC}');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [aiCreatedNames, setAiCreatedNames] = useState([]);

  // --- HANDLERS ---
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleSaveRates = async () => {
    const success = await store.updateSettings({ currency_rates: currencyForm });
    if (success) {
      toast.success(t('common.save'));
      setIsEditRateModalOpen(false);
    }
  };

  const handleRefreshRates = async () => {
    const toastId = toast.loading('Updating rates...');
    try {
      const success = await store.refreshCurrencyRates();
      if (success) {
        toast.dismiss(toastId);
        toast.success('Rates updated successfully');
      } else {
        toast.dismiss(toastId);
        toast.error('Failed to update rates');
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error('Error updating rates');
    }
  };

  const handleSubscribe = async () => {
    const toastId = toast.loading('Enabling notifications...');
    const success = await subscribeToPush();
    if (success) {
      toast.dismiss(toastId);
      toast.success(t('settings.push_enabled'));
    } else {
      toast.dismiss(toastId);
      toast.error(t('settings.push_error'));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return toast.error(t('settings.category_form.name_required'));
    await store.createCategory(newCatName, newCatType, newCatIcon);
    setNewCatName('');
    setIsEmojiOpen(false);
    toast.success(t('common.save'));
  };

  const handleRestoreCategories = async () => {
    if (!confirm(t('common.confirm'))) return;

    const defaultCategories = [
      { name: t('category_names.salary'), type: 'income', icon: '\u{1F4B0}', color: '#10b981' },
      { name: t('category_names.freelance'), type: 'income', icon: '\u{1F4BB}', color: '#3b82f6' },
      { name: t('category_names.groceries'), type: 'expense', icon: '\u{1F6D2}', color: '#ef4444' },
      { name: t('category_names.transport'), type: 'expense', icon: '\u{1F695}', color: '#f59e0b' },
      { name: t('category_names.cafe'), type: 'expense', icon: '\u2615', color: '#8b5cf6' },
      { name: t('category_names.home'), type: 'expense', icon: '\u{1F3E0}', color: '#0ea5e9' },
      { name: t('category_names.communication'), type: 'expense', icon: '\u{1F4F1}', color: '#3b82f6' },
      { name: t('category_names.transfers'), type: 'transfer', icon: '\u{1F504}', color: '#64748b' }
    ];

    let addedCount = 0;
    for (const cat of defaultCategories) {
      const exists = store.categories.some(c => c.name === cat.name && c.type === cat.type);
      if (!exists) {
        await store.createCategory(cat.name, cat.type, cat.icon, cat.color);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(t('toasts.cats_restored', { count: addedCount }));
    } else {
      toast.info(t('toasts.cats_all_exist'));
    }
  };

  const visibleAiSuggestions = aiCategorySuggestions.filter(item => item?.name && !aiCreatedNames.includes(item.name));

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchAiCategorySuggestions();
    }
  }, [activeTab, fetchAiCategorySuggestions]);

  const handleCreateAiSuggestion = async (suggestion) => {
    if (!suggestion?.name) return;
    await store.createCategory(
      suggestion.name,
      suggestion.type || 'expense',
      suggestion.icon || '\u2728',
      suggestion.color
    );
    setAiCreatedNames(prev => Array.from(new Set([...prev, suggestion.name])));
  };

  const handleCreateAllAiSuggestions = async () => {
    if (visibleAiSuggestions.length === 0) return;
    for (const suggestion of visibleAiSuggestions) {
      await store.createCategory(
        suggestion.name,
        suggestion.type || 'expense',
        suggestion.icon || '\u2728',
        suggestion.color
      );
    }
    setAiCreatedNames(prev => Array.from(new Set([
      ...prev,
      ...visibleAiSuggestions.map(item => item.name)
    ])));
  };

  const tabs = [
    { id: 'general', label: t('settings.general'), icon: User },
    { id: 'accounts', label: t('settings.accounts'), icon: Wallet },
    { id: 'categories', label: t('settings.categories'), icon: Tag },
    { id: 'data', label: t('settings.data'), icon: Shield },
  ];

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in pb-32 custom-scrollbar max-w-5xl mx-auto">

      {/* --- HEADER PROFILE SECTION --- */}
      {/* ... (keep existing header code but maybe translate "Premium Member" later) ... */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-900/20 text-white p-6 sm:p-8 lg:p-12 mb-8">
        {/* ... (background decoration) ... */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-40 mix-blend-overlay" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          {/* ... (Avatar and User Info) ... */}
          <div className="relative group">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full p-1 bg-white/20 backdrop-blur-md shadow-inner">
              <div className="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl lg:text-5xl font-black shadow-lg">
                {store.user?.email?.[0].toUpperCase()}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-emerald-400 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-4 border-indigo-600 flex items-center justify-center shadow-lg">
              <Zap size={14} className="text-white fill-white" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold tracking-wider uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t('settings.premium_member')}
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{store.user?.email?.split('@')[0]}</h1>
            <p className="text-indigo-100 font-medium text-lg">{store.user?.email}</p>
          </div>
          <button
            onClick={store.logout}
            className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md font-bold transition-all active:scale-95 flex items-center gap-2"
          >
            <LogOut size={20} />
            <span>{t('settings.logout')}</span>
          </button>
        </div>
      </section>

      {/* --- ANIMATED TABS --- */}
      <div className="relative p-1 bg-white dark:bg-slate-800 rounded-2xl border border-zinc-100 dark:border-white/10 shadow-sm flex overflow-x-auto custom-scrollbar mb-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-colors whitespace-nowrap outline-none ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl border border-indigo-100 dark:border-indigo-500/30 shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >

          {/* === 1. GENERAL TAB === */}
          {activeTab === 'general' && (
            <div className="grid md:grid-cols-2 gap-6">

              {/* Language Switcher Card */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <GlassCard className="h-full border-t-4 border-t-indigo-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Globe size={28} strokeWidth={2} />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.language')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-4">{t('settings.language_desc')}</p>

                  <div className="grid grid-cols-3 gap-2">
                    {['en', 'ru', 'uz'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => changeLanguage(lang)}
                        className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${i18n.language === lang
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          : 'border-zinc-100 dark:border-slate-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div className="group cursor-pointer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <GlassCard className="h-full border-t-4 border-t-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Globe size={28} strokeWidth={2} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefreshRates}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300"
                        title="Update rates from Central Bank"
                      >
                        <RefreshCw size={14} />
                        <span>Update</span>
                      </button>
                      <button onClick={() => setIsEditRateModalOpen(true)} className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        {t('common.edit')}
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.currencies')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-4 flex justify-between items-center">
                    {t('settings.currencies_desc')}
                    {store.settings.updated_at && (
                      <span className="text-xs bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded text-zinc-400">
                        Updated: {new Date(store.settings.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>

                  <div className="space-y-3 bg-zinc-50 dark:bg-slate-900/50 p-4 rounded-xl border border-zinc-100 dark:border-white/10">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-zinc-400 dark:text-zinc-500">USD</span>
                      <span className="text-zinc-900 dark:text-zinc-200">{new Intl.NumberFormat('ru-RU').format(store.settings.currency_rates['USD'])} UZS</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-3/4" />
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-zinc-400 dark:text-zinc-500">EUR</span>
                      <span className="text-zinc-900 dark:text-zinc-200">{new Intl.NumberFormat('ru-RU').format(store.settings.currency_rates['EUR'])} UZS</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <GlassCard className="h-full border-t-4 border-t-emerald-500 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                        <Shield size={28} strokeWidth={2} />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.security')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-4">{t('settings.security_desc')}</p>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-100 dark:hover:border-white/10 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('settings.email_verified')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 font-bold px-3">
                    {t('settings.app_version')} 2.4.0 (Build 890)
                  </div>
                </GlassCard>
              </motion.div>

              {/* Push Notifications - New Card */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <GlassCard className="h-full border-t-4 border-t-rose-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                      <Bell size={28} strokeWidth={2} />
                    </div>
                    <button
                      onClick={handleSubscribe}
                      className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                    >
                      {t('settings.enable_push')}
                    </button>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.notifications')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('settings.push_desc')}</p>
                </GlassCard>
              </motion.div>

              {/* Dark Mode Toggle - New Card */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <GlassCard className="h-full border-t-4 border-t-purple-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                      <Sparkles size={28} strokeWidth={2} />
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={store.settings.dark_mode || false}
                        onChange={async (e) => {
                          const isDark = e.target.checked;
                          await store.updateSettings({ dark_mode: isDark });
                          if (isDark) document.documentElement.classList.add('dark');
                          else document.documentElement.classList.remove('dark');
                        }}
                      />
                      <div className="w-14 h-7 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.appearance')}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('settings.dark_mode_desc')}</p>
                </GlassCard>
              </motion.div>
            </div>
          )}

          {/* === 2. ACCOUNTS TAB === */}
          {activeTab === 'accounts' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-xl text-zinc-900">{t('settings.my_accounts')}</h3>
                  <span className="text-xs font-bold bg-zinc-100 text-zinc-500 py-1 px-3 rounded-full">{store.accounts.length} {t('settings.active_accounts')}</span>
                </div>
                {store.accounts.map((acc, index) => (
                  <motion.div
                    key={acc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                    <GlassCard className="relative flex justify-between items-center group-hover:translate-x-2 transition-transform duration-300 border-zinc-100 group-hover:border-indigo-200">
                      <div className="flex items-center gap-5">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-gray-200/50"
                          style={{ backgroundColor: acc.color, color: '#fff' }}
                        >
                          {acc.icon || '\u{1F4B3}'}
                        </div>
                        <div>
                          <div className="font-black text-lg text-zinc-900 mb-1">{acc.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md uppercase tracking-wider">{acc.currency}</span>
                            <span className="text-sm font-bold text-zinc-600">{new Intl.NumberFormat('ru-RU').format(store.getAccountBalance(acc.id))}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => confirm(t('common.confirm')) && store.deleteAccount(acc.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} strokeWidth={2} />
                      </button>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Add Account Card */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <GlassCard
                  className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-6 border border-zinc-100 dark:border-white/5 bg-gradient-to-br from-white/50 to-indigo-50/50 dark:from-white/5 dark:to-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group cursor-pointer group"
                  onClick={() => setIsAccountModalOpen(true)}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                    <div className="relative w-24 h-24 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-none border border-indigo-50 dark:border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <Wallet size={48} strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <h3 className="font-black text-2xl text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t('settings.new_account')}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                      {t('settings.new_account_desc')}
                    </p>
                  </div>

                  <div className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:rotate-90 transition-transform duration-500">
                    <Plus size={28} strokeWidth={3} />
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}

          {/* === 3. CATEGORIES TAB (REDESIGNED) === */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Top Section: Manager & Actions */}
              <GlassCard className="overflow-visible z-20">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      {t('settings.categories')}
                      <span className="text-sm font-bold bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                        {store.categories.length}
                      </span>
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">{t('settings.new_account_desc')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRestoreCategories}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-bold text-xs hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                      title={t('settings.restore_categories')}
                    >
                      <RefreshCw size={14} />
                      <span className="hidden sm:inline">{t('settings.restore_categories')}</span>
                    </button>
                    <button
                      onClick={() => confirm(t('common.confirm')) && store.deleteAllCategories()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-bold text-xs hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors"
                      title={t('settings.clear_categories')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* --- ADD CATEGORY COMMAND BAR --- */}
                <div className="bg-zinc-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-zinc-100 dark:border-white/5 flex flex-col md:flex-row gap-2 shadow-inner">

                  {/* Emoji Picker Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white dark:bg-slate-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-2xl shadow-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      {newCatIcon}
                    </button>
                    {isEmojiOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-zinc-100 dark:border-white/10 rounded-2xl p-4 shadow-xl z-50">
                        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {EMOJI_OPTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                setNewCatIcon(emoji);
                                setIsEmojiOpen(false);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xl transition-colors active:scale-95 font-emoji"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name Input */}
                  <div className="flex-1 relative">
                    <input
                      className="w-full h-12 md:h-14 px-4 rounded-xl bg-white dark:bg-slate-800 border-none outline-none font-bold text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder={t('settings.category_form.name') + "..."}
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    />
                  </div>

                  {/* Type Toggles */}
                  <div className="flex bg-zinc-200 dark:bg-black/20 p-1 rounded-xl">
                    <button
                      onClick={() => setNewCatType('expense')}
                      className={`px-4 rounded-lg text-sm font-bold transition-all ${newCatType === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                    >
                      {t('modals.transaction.type_expense')}
                    </button>
                    <button
                      onClick={() => setNewCatType('income')}
                      className={`px-4 rounded-lg text-sm font-bold transition-all ${newCatType === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                    >
                      {t('modals.transaction.type_income')}
                    </button>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCatName.trim()}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>

              </GlassCard>

              {/* --- AI CATEGORY SUGGESTIONS (Restored & Enhanced) --- */}
              <GlassCard className="relative overflow-hidden border-none shadow-2xl shadow-indigo-500/10">
                {/* Background Gradients */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
                <div className="absolute -top-10 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 p-2 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                        <Sparkles size={24} className="fill-indigo-600/20" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                          {t('ai.categories_suggest.title')}
                          <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold text-white uppercase tracking-wider">
                            AI Powered
                          </span>
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                          {t('ai.categories_suggest.subtitle')}
                        </p>
                      </div>
                    </div>
                    {visibleAiSuggestions.length > 0 && (
                      <button
                        onClick={handleCreateAllAiSuggestions}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        {t('ai.categories_suggest.create_all')}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isAiCategoriesLoading && [1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse" />
                    ))}

                    {!isAiCategoriesLoading && visibleAiSuggestions.length === 0 && (
                      <div className="col-span-full py-8 text-center border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-3xl bg-zinc-50/50 dark:bg-white/5">
                        <p className="text-zinc-400 font-medium mb-2">{t('ai.categories_suggest.empty')}</p>
                        <span className="text-xs text-zinc-300 uppercase tracking-widest font-bold">Waiting for new transactions...</span>
                      </div>
                    )}

                    {!isAiCategoriesLoading && visibleAiSuggestions.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleCreateAiSuggestion(item)}
                        className="group flex items-center justify-between p-3 bg-white/80 dark:bg-slate-800/80 border border-zinc-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl filter drop-shadow-sm">{item.icon}</span>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-zinc-400 group-hover:text-indigo-400/70">
                              {item.type === 'income' ? t('modals.transaction.type_income') : t('modals.transaction.type_expense')}
                            </div>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100">
                          <Plus size={16} strokeWidth={3} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Lists Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Expenses List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 pl-2">
                    {t('analytics.expenses')} ({store.categories.filter(c => c.type === 'expense').length})
                  </h4>
                  <div className="grid gap-2">
                    {store.categories.filter(c => c.type === 'expense').map(c => (
                      <div key={c.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-xl">{c.icon}</div>
                          <span className="font-bold text-zinc-700 dark:text-zinc-200">{c.name}</span>
                        </div>
                        <button
                          onClick={() => store.deleteCategory(c.id)}
                          className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Income List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 pl-2">
                    {t('analytics.income')} ({store.categories.filter(c => c.type === 'income').length})
                  </h4>
                  <div className="grid gap-2">
                    {store.categories.filter(c => c.type === 'income').map(c => (
                      <div key={c.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-xl">{c.icon}</div>
                          <span className="font-bold text-zinc-700 dark:text-zinc-200">{c.name}</span>
                        </div>
                        <button
                          onClick={() => store.deleteCategory(c.id)}
                          className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* === 4. DATA TAB === */}
          {activeTab === 'data' && (
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="group">
                <div className="h-full bg-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                        <Download size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black mb-2">{t('settings.export')}</h3>
                        <p className="text-indigo-200 font-medium">{t('settings.export_desc')}</p>
                      </div>
                    </div>
                    <button onClick={() => store.exportDataToExcel()} className="mt-8 py-4 px-6 bg-white text-indigo-900 rounded-xl font-black text-lg flex items-center justify-between group-hover:scale-105 transition-transform">
                      <span>{t('settings.download_xlsx')}</span>
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="group">
                <div className="h-full bg-white rounded-[2rem] p-8 relative overflow-hidden shadow-xl border border-zinc-100">
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900">
                        <Upload size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-zinc-900 mb-2">{t('settings.import')}</h3>
                        <p className="text-zinc-500 font-medium">{t('settings.import_desc')}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsImportModalOpen(true)} className="mt-8 py-4 px-6 bg-zinc-900 text-white rounded-xl font-black text-lg flex items-center justify-between group-hover:scale-105 transition-transform">
                      <span>{t('settings.upload_file')}</span>
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* --- MODALS --- */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <Modal isOpen={isEditRateModalOpen} onClose={() => setIsEditRateModalOpen(false)} title={t('settings.currency_modal_title')}>
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600 text-sm font-medium mb-4 border border-indigo-100">
            {t('settings.base_currency_info')}
          </div>

          <div className="space-y-3">
            {[
              { code: 'USD', name: '\u0414\u043e\u043b\u043b\u0430\u0440 \u0421\u0428\u0410 ($)' },
              { code: 'EUR', name: '\u0415\u0432\u0440\u043e (\u20ac)' },
              { code: 'RUB', name: '\u0420\u0443\u0431\u043b\u044c (\u20bd)' }
            ].map((currency) => (
              <div key={currency.code} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                <div className="w-12 font-bold text-zinc-400">{currency.code}</div>
                <input
                  type="number"
                  placeholder="0"
                  className="flex-1 p-2 bg-white border border-zinc-200 rounded-lg font-bold outline-none text-zinc-900 focus:border-indigo-500 text-right tabular-nums"
                  value={currencyForm[currency.code] || ''}
                  onChange={e => setCurrencyForm({ ...currencyForm, [currency.code]: Number(e.target.value) })}
                />
                <div className="text-sm font-bold text-zinc-400 w-8">UZS</div>
              </div>
            ))}
          </div>

          <Button onClick={handleSaveRates} className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">{t('settings.save_rates')}</Button>
        </div>
      </Modal>
    </div>
  );
}

