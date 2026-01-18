import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import CounterpartyCard from '../components/CounterpartyCard';
import CounterpartyModal from '../components/CounterpartyModal';
import { Plus, Search, Star } from 'lucide-react';
import Button from '../components/ui/Button';
import { useTranslation } from 'react-i18next'; // Import hook

export default function Counterparties() {
    const { t } = useTranslation(); // Init hook
    const { counterparties, createCounterparty, updateCounterparty } = useFinanceStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCounterparty, setEditingCounterparty] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSubmit = async (formData) => {
        if (editingCounterparty) {
            await updateCounterparty(editingCounterparty.id, formData);
        } else {
            await createCounterparty(formData);
        }
        setEditingCounterparty(null);
    };

    const handleEdit = (counterparty) => {
        setEditingCounterparty(counterparty);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingCounterparty(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCounterparty(null);
    };

    // Фильтрация по поиску
    const filteredCounterparties = counterparties.filter(cp =>
        cp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Разделяем на избранные и обычные
    const favoriteCounterparties = filteredCounterparties.filter(cp => cp.favorite);
    const regularCounterparties = filteredCounterparties.filter(cp => !cp.favorite);

    return (
        <div className="max-w-7xl mx-auto pb-28 sm:pb-32 space-y-8 animate-fade-in custom-scrollbar">
            {/* Заголовок и поиск */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="text-3xl font-black text-zinc-900">📇 {t('counterparties.title')}</h1>
                    <Button
                        onClick={handleAdd}
                        icon={Plus}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white justify-center"
                    >
                        {t('counterparties.add')}
                    </Button>
                </div>

                {/* Поиск */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={20} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder={t('counterparties.search_placeholder')}
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-zinc-100 rounded-xl outline-none focus:border-indigo-500 text-zinc-900 placeholder-zinc-400 font-medium transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Избранные */}
            {favoriteCounterparties.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={20} className="text-amber-500" fill="currentColor" strokeWidth={2.5} />
                        <h2 className="text-xl font-bold text-zinc-900">{t('counterparties.favorites')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favoriteCounterparties.map(cp => (
                            <CounterpartyCard key={cp.id} counterparty={cp} onEdit={handleEdit} />
                        ))}
                    </div>
                </div>
            )}

            {/* Все контрагенты */}
            {regularCounterparties.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-4">
                        {t('counterparties.all')} ({regularCounterparties.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regularCounterparties.map(cp => (
                            <CounterpartyCard key={cp.id} counterparty={cp} onEdit={handleEdit} />
                        ))}
                    </div>
                </div>
            )}

            {/* Пустое состояние (NEW DESIGN) */}
            {filteredCounterparties.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center animate-fade-in">
                    {searchQuery ? (
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="w-20 h-20 mx-auto bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-2">
                                <Search size={32} className="text-zinc-400" strokeWidth={2} />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{t('counterparties.empty_search')}</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t('counterparties.empty_search_desc')}</p>
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto relative group cursor-pointer" onClick={handleAdd}>
                            {/* Decorative Background */}
                            <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            <div className="relative z-10 space-y-6">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-[2rem] flex items-center justify-center shadow-inner border border-white/20 dark:border-white/5 group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-5xl filter drop-shadow-sm">📇</span>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{t('counterparties.empty_list')}</h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg leading-relaxed">
                                        {t('counterparties.empty_list_desc')}
                                    </p>
                                </div>

                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                                    icon={Plus}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 px-8 py-4 h-auto text-lg rounded-2xl mx-auto"
                                >
                                    {t('counterparties.add_first')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Модалка */}
            <CounterpartyModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                initialData={editingCounterparty}
            />
        </div>
    );
}
