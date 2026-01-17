import React, { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Trash2, Plus, LogOut, User, Wallet, Tag, Shield, Download, Upload, Globe, ChevronRight, Zap, RefreshCw, Sparkles } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/ui/Toast';

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

    for (const cat of defaultCategories) {
      await store.createCategory(cat.name, cat.type, cat.icon, cat.color);
    }
    toast.success('Categories restored');
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
      <div className="relative p-1 bg-white rounded-2xl border border-zinc-100 shadow-sm flex overflow-x-auto custom-scrollbar mb-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-colors whitespace-nowrap outline-none ${isActive ? 'text-indigo-600' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-indigo-50 rounded-xl border border-indigo-100 shadow-inner"
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
                  <h3 className="text-xl font-black text-zinc-900 mb-1">{t('settings.language')}</h3>
                  <p className="text-zinc-500 font-medium mb-4">{t('settings.language_desc')}</p>

                  <div className="grid grid-cols-3 gap-2">
                    {['en', 'ru', 'uz'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => changeLanguage(lang)}
                        className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${i18n.language === lang
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-zinc-100 text-zinc-500 hover:border-indigo-200'}`}
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
                    <button onClick={() => setIsEditRateModalOpen(true)} className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      {t('common.edit')}
                    </button>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 mb-1">{t('settings.currencies')}</h3>
                  <p className="text-zinc-500 font-medium mb-4">{t('settings.currencies_desc')}</p>

                  <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-zinc-400">USD</span>
                      <span className="text-zinc-900">{new Intl.NumberFormat('ru-RU').format(store.settings.currency_rates['USD'])} UZS</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-3/4" />
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-zinc-400">EUR</span>
                      <span className="text-zinc-900">{new Intl.NumberFormat('ru-RU').format(store.settings.currency_rates['EUR'])} UZS</span>
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
                    <h3 className="text-xl font-black text-zinc-900 mb-1">{t('settings.security')}</h3>
                    <p className="text-zinc-500 font-medium mb-4">{t('settings.security_desc')}</p>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer border border-transparent hover:border-zinc-100 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-zinc-700">{t('settings.email_verified')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 font-bold px-3">
                    {t('settings.app_version')} 2.4.0 (Build 890)
                  </div>
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
                <GlassCard className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-6 border-2 border-dashed border-zinc-200 shadow-none hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer group" onClick={() => setIsAccountModalOpen(true)}>
                  <div className="w-20 h-20 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={40} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-2xl text-zinc-900 group-hover:text-indigo-600 transition-colors">{t('settings.new_account')}</h3>
                    <p className="text-zinc-500 font-medium max-w-[200px] mx-auto">{t('settings.new_account_desc')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:rotate-90 transition-transform duration-500">
                    <Plus size={24} strokeWidth={3} />
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}

          {/* === 3. CATEGORIES TAB === */}
          {activeTab === 'categories' && (
            <div className="relative space-y-8">
              <div className="pointer-events-none absolute -top-24 right-[-60px] w-80 h-80 rounded-full bg-emerald-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-[-40px] w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

              <div className="relative grid lg:grid-cols-[1.35fr,0.65fr] gap-6">
                <GlassCard className="border-none bg-white/85 shadow-2xl shadow-emerald-100/40 overflow-visible p-7 sm:p-8">
                  <div className="absolute inset-y-6 left-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-300" />
                  <div className="relative space-y-6 pl-4 sm:pl-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600">{t('settings.categories')}</span>
                        <h3 className="text-3xl sm:text-4xl font-black text-zinc-900 mt-2">{t('settings.categories')}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Tag size={20} />
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold uppercase text-zinc-400">{t('settings.categories')}</div>
                          <div className="text-3xl font-black text-zinc-900 leading-none">{store.categories.length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-emerald-200 via-zinc-100 to-transparent" />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{t('settings.category_form.name')}</label>
                        <input
                          className="w-full h-12 px-4 rounded-2xl bg-white border border-zinc-100 font-bold outline-none text-zinc-900 placeholder-zinc-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
                          placeholder="..."
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{t('settings.category_form.type')}</label>
                        <div className="flex items-center gap-2 p-1 rounded-2xl bg-zinc-50 border border-zinc-100">
                          <button
                            type="button"
                            onClick={() => setNewCatType('expense')}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${newCatType === 'expense'
                              ? 'bg-white text-zinc-900 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-800'}`}
                          >
                            {t('modals.transaction.type_expense')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCatType('income')}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${newCatType === 'income'
                              ? 'bg-white text-zinc-900 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-800'}`}
                          >
                            {t('modals.transaction.type_income')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{t('settings.category_form.emoji')}</label>
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEmojiOpen(prev => !prev)}
                              className="w-14 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-2xl font-emoji shadow-sm hover:border-emerald-200"
                            >
                              {newCatIcon || '\u2728'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEmojiOpen(prev => !prev)}
                              className="flex-1 h-12 px-3 rounded-2xl border border-dashed border-zinc-200 text-sm font-bold text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                            >
                              {t('settings.category_form.select_emoji')}
                            </button>
                          </div>
                          {isEmojiOpen && (
                            <div className="absolute top-full left-0 mt-3 w-72 bg-white border border-zinc-100 rounded-2xl p-4 shadow-xl z-50">
                              <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto custom-scrollbar">
                                {EMOJI_OPTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      setNewCatIcon(emoji);
                                      setIsEmojiOpen(false);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-xl transition-colors active:scale-95 font-emoji"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-2">
                        <div className="w-12 h-12 rounded-2xl bg-white text-2xl flex items-center justify-center font-emoji shadow-sm">
                          {newCatIcon || '\u2728'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{newCatName.trim() || t('settings.category_form.name')}</div>
                          <div className="text-xs text-zinc-400">
                            {newCatType === 'income' ? t('modals.transaction.type_income') : t('modals.transaction.type_expense')}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCreateCategory}
                        className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} className="stroke-[3px]" />
                        <span>{t('common.add')}</span>
                      </button>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="border-none bg-white/80 shadow-2xl shadow-indigo-100/40 p-7 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">{t('settings.categories')}</div>
                      <div className="text-3xl font-black text-zinc-900 mt-2">{store.categories.length}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={handleRestoreCategories}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <span className="flex items-center gap-2"><RefreshCw size={16} /> {t('settings.restore_categories')}</span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => confirm(t('common.confirm')) && store.deleteAllCategories()}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors"
                    >
                      <span className="flex items-center gap-2"><Trash2 size={16} /> {t('settings.clear_categories')}</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="border-none bg-white/85 shadow-2xl shadow-indigo-100/40 p-6 sm:p-7 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-emerald-400 to-amber-300" />
                <div className="absolute -top-10 right-10 w-32 h-32 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 left-6 w-40 h-40 rounded-full bg-emerald-200/30 blur-2xl pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('ai.categories_suggest.title')}</div>
                        <div className="text-sm font-semibold text-zinc-600">{t('ai.categories_suggest.subtitle')}</div>
                      </div>
                    </div>
                    {visibleAiSuggestions.length > 1 && (
                      <button
                        onClick={handleCreateAllAiSuggestions}
                        className="h-10 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold tracking-wide uppercase shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all"
                      >
                        {t('ai.categories_suggest.create_all')}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    {isAiCategoriesLoading && [0, 1, 2].map((item) => (
                      <div key={item} className="rounded-2xl border border-zinc-100 bg-white/90 p-4 shadow-sm animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-zinc-200 rounded w-3/5" />
                            <div className="h-3 bg-zinc-100 rounded w-2/5" />
                          </div>
                        </div>
                      </div>
                    ))}

                    {!isAiCategoriesLoading && visibleAiSuggestions.length === 0 && (
                      <div className="sm:col-span-3 text-sm text-zinc-500 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl px-4 py-5">
                        {t('ai.categories_suggest.empty')}
                      </div>
                    )}

                    {!isAiCategoriesLoading && visibleAiSuggestions.map((item) => (
                      <div key={item.name} className="group rounded-2xl border border-zinc-100 bg-white/90 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-emoji"
                              style={{ backgroundColor: item.color ? `${item.color}22` : '#f8fafc' }}
                            >
                              {item.icon || '\u2728'}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-800">{item.name}</div>
                              <div className="text-[11px] font-semibold text-zinc-400">
                                {item.type === 'income' ? t('modals.transaction.type_income') : t('modals.transaction.type_expense')}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCreateAiSuggestion(item)}
                            className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
                          >
                            {t('ai.categories_suggest.create')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <div className="grid lg:grid-cols-2 gap-6">
                <GlassCard className="border-none bg-white/85 shadow-2xl shadow-emerald-100/40 p-7 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('analytics.income')}</div>
                        <div className="text-lg font-black text-zinc-900">{store.categories.filter(c => c.type === 'income').length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {store.categories.filter(c => c.type === 'income').map(c => (
                      <div key={c.id} className="group flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white/90 px-3 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl font-emoji">{c.icon}</div>
                          <span className="font-bold text-zinc-800">{c.name}</span>
                        </div>
                        <button
                          onClick={() => store.deleteCategory(c.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="border-none bg-white/85 shadow-2xl shadow-rose-100/40 p-7 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('analytics.expenses')}</div>
                        <div className="text-lg font-black text-zinc-900">{store.categories.filter(c => c.type === 'expense').length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    {store.categories.filter(c => c.type === 'expense').map(c => (
                      <div key={c.id} className="group flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white/90 px-3 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 flex items-center justify-center text-xl font-emoji">{c.icon}</div>
                          <span className="font-bold text-zinc-800 text-sm truncate">{c.name}</span>
                        </div>
                        <button
                          onClick={() => store.deleteCategory(c.id)}
                          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </GlassCard>
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

