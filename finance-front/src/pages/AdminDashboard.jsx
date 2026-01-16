import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { Shield, RefreshCw, Search, Download, Users, Activity, FileText, CheckCircle2, AlertTriangle, Database, Eye, Ban, Unlock, Trash2, KeyRound, Filter } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../api/axios';
import { toast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';

const StatCard = ({ title, value, icon: Icon, accent }) => (
    <GlassCard className="relative overflow-hidden">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</p>
                <div className="text-2xl sm:text-3xl font-black text-zinc-900 mt-2">{value}</div>
            </div>
            <div className={`p-3 rounded-2xl ${accent} bg-opacity-10`}>
                <Icon size={22} className={accent.replace('bg-', 'text-')} strokeWidth={2.5} />
            </div>
        </div>
        <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full ${accent} opacity-5`} />
    </GlassCard>
);

const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse bg-white/70 border border-white/60 rounded-3xl ${className}`} />
);

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/90 backdrop-blur-xl border border-white/70 rounded-2xl px-4 py-3 shadow-xl">
            <div className="text-xs font-bold text-zinc-400 mb-2">{label}</div>
            {payload.map((item) => (
                <div key={item.dataKey} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="font-bold text-zinc-700">{item.name}: {item.value}</span>
                </div>
            ))}
        </div>
    );
};

const formatDateTime = (value, fallback) => {
    if (!value) return fallback || 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback || 'N/A';
    return date.toLocaleString();
};

const formatDate = (value, fallback) => {
    if (!value) return fallback || 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback || 'N/A';
    return date.toLocaleDateString();
};

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState(false);

    const [userQuery, setUserQuery] = useState({
        page: 1,
        limit: 10,
        status: 'all',
        sort: 'created_at',
        order: 'desc',
        search: ''
    });
    const [userSearch, setUserSearch] = useState('');
    const [usersData, setUsersData] = useState({ users: [], total: 0, total_pages: 1 });
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [resetPasswordInfo, setResetPasswordInfo] = useState(null);

    const [contentQuery, setContentQuery] = useState({
        page: 1,
        limit: 10,
        type: 'transactions',
        status: 'all',
        search: '',
        user_id: ''
    });
    const [contentSearch, setContentSearch] = useState('');
    const [contentData, setContentData] = useState({ items: [], total: 0, total_pages: 1 });
    const [contentLoading, setContentLoading] = useState(true);
    const [contentError, setContentError] = useState(false);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError(false);
        try {
            const { data } = await api.get('/admin/summary');
            setSummary(data);
        } catch (error) {
            console.error('Admin summary error:', error);
            setSummaryError(true);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        setUsersError(false);
        try {
            const { data } = await api.get('/admin/users', { params: userQuery });
            setUsersData(data);
        } catch (error) {
            console.error('Admin users error:', error);
            setUsersError(true);
        } finally {
            setUsersLoading(false);
        }
    }, [userQuery]);

    const fetchContent = useCallback(async () => {
        setContentLoading(true);
        setContentError(false);
        try {
            const { data } = await api.get('/admin/content', { params: contentQuery });
            setContentData(data);
        } catch (error) {
            console.error('Admin content error:', error);
            setContentError(true);
        } finally {
            setContentLoading(false);
        }
    }, [contentQuery]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleRefresh = async () => {
        await Promise.all([fetchSummary(), fetchUsers(), fetchContent()]);
        toast.success(t('admin.toasts.refreshed'));
    };

    const handleExport = async (format) => {
        try {
            const response = await api.get('/admin/export', { params: { format }, responseType: 'blob' });
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = format === 'json' ? 'users.json' : 'users.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('admin.toasts.export_failed'));
        }
    };

    const applyUserSearch = () => {
        setUserQuery(prev => ({ ...prev, search: userSearch.trim(), page: 1 }));
    };

    const applyContentSearch = () => {
        setContentQuery(prev => ({ ...prev, search: contentSearch.trim(), page: 1 }));
    };

    const handleUserAction = async (id, action) => {
        try {
            if (action === 'delete' && !window.confirm(t('admin.confirm_delete_user'))) return;
            const endpoints = {
                ban: `/admin/users/${id}/ban`,
                unban: `/admin/users/${id}/unban`,
                delete: `/admin/users/${id}`,
                reset: `/admin/users/${id}/reset-password`
            };
            if (action === 'delete') {
                await api.delete(endpoints[action]);
            } else if (action === 'reset') {
                const { data } = await api.post(endpoints[action]);
                setResetPasswordInfo({ id, temp_password: data.temp_password });
            } else {
                await api.post(endpoints[action]);
            }
            await Promise.all([fetchUsers(), fetchSummary()]);
        } catch (error) {
            console.error('User action error:', error);
            toast.error(t('admin.toasts.action_failed'));
        }
    };

    const handleModerateContent = async (type, id, action) => {
        try {
            await api.post(`/admin/content/${type}/${id}/action`, { action });
            await Promise.all([fetchContent(), fetchSummary()]);
        } catch (error) {
            console.error('Moderate content error:', error);
            toast.error(t('admin.toasts.content_action_failed'));
        }
    };

    const registrationChartData = useMemo(() => {
        if (!summary?.charts?.registrations) return [];
        return summary.charts.registrations.map((row, idx) => ({
            date: row.date,
            registrations: row.count,
            activity: summary.charts.activity?.[idx]?.count || 0
        }));
    }, [summary]);

    const contentChartData = useMemo(() => summary?.charts?.content || [], [summary]);

    const kpis = summary?.kpis || {};
    const notAvailable = t('admin.common.not_available');
    const statusLabels = {
        active: t('admin.status.active'),
        banned: t('admin.status.banned'),
        pending: t('admin.status.pending')
    };
    const contentStatusLabels = {
        published: t('admin.status.published'),
        removed: t('admin.status.removed')
    };
    const statusBadgeStyles = {
        active: 'bg-emerald-100 text-emerald-700',
        banned: 'bg-rose-100 text-rose-600',
        pending: 'bg-amber-100 text-amber-700'
    };

    return (
        <div className="space-y-8 sm:space-y-10 pb-28 sm:pb-32 animate-fade-in">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">Finance Empire</h1>
                        <p className="text-zinc-500 font-medium">{t('admin.title')}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && applyUserSearch()}
                            placeholder={t('admin.search_participants')}
                            className="pl-10 pr-4 py-2.5 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md text-sm font-semibold text-zinc-700 shadow-sm"
                        />
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => applyUserSearch()} icon={Search}>{t('admin.search')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} icon={Download}>{t('admin.export_csv')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport('json')} icon={Download}>{t('admin.export_json')}</Button>
                    <Button variant="outline" size="sm" onClick={handleRefresh} icon={RefreshCw}>{t('admin.refresh')}</Button>
                </div>
            </div>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {summaryLoading ? (
                    <>
                        <SkeletonBlock className="h-28" />
                        <SkeletonBlock className="h-28" />
                        <SkeletonBlock className="h-28" />
                        <SkeletonBlock className="h-28" />
                        <SkeletonBlock className="h-28" />
                        <SkeletonBlock className="h-28" />
                    </>
                ) : summaryError ? (
                    <GlassCard className="col-span-full flex flex-col gap-4 items-start">
                        <div className="text-zinc-700 font-bold">{t('admin.errors.summary')}</div>
                        <Button onClick={fetchSummary} icon={RefreshCw} variant="outline" size="sm">{t('admin.buttons.retry')}</Button>
                    </GlassCard>
                ) : (
                    <>
                        <StatCard title={t('admin.metrics.total_participants')} value={kpis.total_users ?? 0} icon={Users} accent="bg-teal-600" />
                        <StatCard title={t('admin.metrics.new_24h')} value={kpis.new_users_24h ?? 0} icon={Activity} accent="bg-emerald-500" />
                        <StatCard title={t('admin.metrics.new_7d')} value={kpis.new_users_7d ?? 0} icon={Activity} accent="bg-amber-500" />
                        <StatCard title={t('admin.metrics.active_today')} value={kpis.active_today ?? 0} icon={CheckCircle2} accent="bg-indigo-500" />
                        <StatCard title={t('admin.metrics.total_entities')} value={kpis.total_entities ?? 0} icon={Database} accent="bg-sky-500" />
                        <StatCard title={t('admin.metrics.goal_completion')} value={`${kpis.goal_completion_pct ?? 0}%`} icon={FileText} accent="bg-rose-500" />
                    </>
                )}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <GlassCard className="min-h-[360px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-teal-600" />
                        <h3 className="text-lg font-black text-zinc-900">{t('admin.charts.registrations_activity')}</h3>
                    </div>
                    {summaryLoading ? (
                        <SkeletonBlock className="h-64" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={registrationChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="registrations" name={t('admin.charts.registrations')} stroke="#14b8a6" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="activity" name={t('admin.charts.actions')} stroke="#f59e0b" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </GlassCard>
                <GlassCard className="min-h-[360px]">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-amber-600" />
                        <h3 className="text-lg font-black text-zinc-900">{t('admin.charts.content_creation')}</h3>
                    </div>
                    {summaryLoading ? (
                        <SkeletonBlock className="h-64" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={contentChartData}>
                                <defs>
                                    <linearGradient id="contentGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="count" name={t('admin.charts.items')} stroke="#fb923c" strokeWidth={3} fill="url(#contentGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </GlassCard>
            </section>

            <section className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900">{t('admin.users.title')}</h2>
                        <p className="text-zinc-500 font-medium">{t('admin.users.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                            <Filter size={16} />
                            {t('admin.filters.title')}
                        </div>
                        <select
                            value={userQuery.status}
                            onChange={(event) => setUserQuery(prev => ({ ...prev, status: event.target.value, page: 1 }))}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                            <option value="all">{t('admin.status.all')}</option>
                            <option value="active">{t('admin.status.active')}</option>
                            <option value="banned">{t('admin.status.banned')}</option>
                            <option value="pending">{t('admin.status.pending')}</option>
                        </select>
                        <select
                            value={userQuery.sort}
                            onChange={(event) => setUserQuery(prev => ({ ...prev, sort: event.target.value }))}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                            <option value="created_at">{t('admin.sort.newest')}</option>
                            <option value="last_login_at">{t('admin.sort.last_login')}</option>
                            <option value="email">{t('admin.sort.email')}</option>
                        </select>
                    </div>
                </div>

                <GlassCard className="p-0 overflow-hidden">
                    {usersLoading ? (
                        <div className="p-6 space-y-4">
                            <SkeletonBlock className="h-10" />
                            <SkeletonBlock className="h-10" />
                            <SkeletonBlock className="h-10" />
                        </div>
                    ) : usersError ? (
                        <div className="p-6 flex flex-col gap-4">
                            <div className="text-zinc-700 font-semibold">{t('admin.errors.users')}</div>
                            <Button onClick={fetchUsers} variant="outline" size="sm">{t('admin.buttons.retry')}</Button>
                        </div>
                    ) : usersData.users.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 font-semibold">
                            {t('admin.users.empty')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-[960px] w-full text-left text-sm">
                                <thead className="bg-white/80 text-zinc-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.id')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.email')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.registered')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.last_login')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.status')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.users.table.activity')}</th>
                                        <th className="px-6 py-4 font-bold text-right">{t('admin.users.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersData.users.map((user) => (
                                        <tr key={user.id} className="border-t border-white/60 hover:bg-white/70">
                                            <td className="px-6 py-4 font-semibold text-zinc-700">{user.id.slice(0, 8)}...</td>
                                            <td className="px-6 py-4 font-semibold text-zinc-900">{user.email}</td>
                                            <td className="px-6 py-4 text-zinc-600">{formatDate(user.created_at, notAvailable)}</td>
                                            <td className="px-6 py-4 text-zinc-600">{formatDateTime(user.last_login_at, notAvailable)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeStyles[user.status] || statusBadgeStyles.active}`}>
                                                    {statusLabels[user.status] || user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600">
                                                {user.metrics?.actionsCount ?? 0} {t('admin.users.actions_suffix')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setSelectedUser(user)} />
                                                    {user.status === 'banned' ? (
                                                        <Button size="sm" variant="success" icon={Unlock} onClick={() => handleUserAction(user.id, 'unban')} />
                                                    ) : (
                                                        <Button size="sm" variant="danger" icon={Ban} onClick={() => handleUserAction(user.id, 'ban')} />
                                                    )}
                                                    <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => handleUserAction(user.id, 'reset')} />
                                                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleUserAction(user.id, 'delete')} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/60">
                        <div className="text-xs font-bold text-zinc-400">
                            {usersData.total} {t('admin.common.participants')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={userQuery.page <= 1}
                                onClick={() => setUserQuery(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            >
                                {t('admin.buttons.prev')}
                            </Button>
                            <span className="text-xs font-bold text-zinc-500">
                                {t('admin.pagination.page_of', { page: userQuery.page, total: usersData.total_pages || 1 })}
                            </span>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={userQuery.page >= (usersData.total_pages || 1)}
                                onClick={() => setUserQuery(prev => ({ ...prev, page: Math.min((usersData.total_pages || 1), prev.page + 1) }))}
                            >
                                {t('admin.buttons.next')}
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </section>
            <section className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900">{t('admin.content.title')}</h2>
                        <p className="text-zinc-500 font-medium">{t('admin.content.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            value={contentSearch}
                            onChange={(event) => setContentSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && applyContentSearch()}
                            placeholder={t('admin.search_content')}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        />
                        <Button size="sm" variant="secondary" icon={Search} onClick={applyContentSearch}>{t('admin.search')}</Button>
                        <select
                            value={contentQuery.type}
                            onChange={(event) => setContentQuery(prev => ({ ...prev, type: event.target.value, page: 1 }))}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                            <option value="transactions">{t('admin.content.types.transactions')}</option>
                            <option value="debts">{t('admin.content.types.debts')}</option>
                            <option value="goals">{t('admin.content.types.goals')}</option>
                        </select>
                        <select
                            value={contentQuery.status}
                            onChange={(event) => setContentQuery(prev => ({ ...prev, status: event.target.value, page: 1 }))}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        >
                            <option value="all">{t('admin.status.all')}</option>
                            <option value="published">{t('admin.status.published')}</option>
                            <option value="removed">{t('admin.status.removed')}</option>
                        </select>
                        <input
                            value={contentQuery.user_id}
                            onChange={(event) => setContentQuery(prev => ({ ...prev, user_id: event.target.value, page: 1 }))}
                            placeholder={t('admin.labels.user_id')}
                            className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-700"
                        />
                    </div>
                </div>

                <GlassCard className="p-0 overflow-hidden">
                    {contentLoading ? (
                        <div className="p-6 space-y-4">
                            <SkeletonBlock className="h-10" />
                            <SkeletonBlock className="h-10" />
                            <SkeletonBlock className="h-10" />
                        </div>
                    ) : contentError ? (
                        <div className="p-6 flex flex-col gap-4">
                            <div className="text-zinc-700 font-semibold">{t('admin.errors.content')}</div>
                            <Button onClick={fetchContent} variant="outline" size="sm">{t('admin.buttons.retry')}</Button>
                        </div>
                    ) : contentData.items.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 font-semibold">
                            {t('admin.content.empty')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-[900px] w-full text-left text-sm">
                                <thead className="bg-white/80 text-zinc-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">{t('admin.content.table.id')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.content.table.title')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.content.table.user')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.content.table.status')}</th>
                                        <th className="px-6 py-4 font-bold">{t('admin.content.table.created')}</th>
                                        <th className="px-6 py-4 font-bold text-right">{t('admin.content.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contentData.items.map((item) => (
                                        <tr key={item.id} className="border-t border-white/60 hover:bg-white/70">
                                            <td className="px-6 py-4 font-semibold text-zinc-700">{item.id.slice(0, 8)}...</td>
                                            <td className="px-6 py-4 font-semibold text-zinc-900">{item.title}</td>
                                            <td className="px-6 py-4 text-zinc-600">{item.user?.email || notAvailable}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'removed' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {contentStatusLabels[item.status] || item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600">{formatDate(item.created_at, notAvailable)}</td>
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'removed' ? (
                                                    <Button size="sm" variant="success" onClick={() => handleModerateContent(item.entity_type, item.id, 'restore')}>
                                                        {t('admin.buttons.restore')}
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="danger" onClick={() => handleModerateContent(item.entity_type, item.id, 'remove')}>
                                                        {t('admin.buttons.remove')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/60">
                        <div className="text-xs font-bold text-zinc-400">
                            {contentData.total} {t('admin.common.items')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={contentQuery.page <= 1}
                                onClick={() => setContentQuery(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            >
                                {t('admin.buttons.prev')}
                            </Button>
                            <span className="text-xs font-bold text-zinc-500">
                                {t('admin.pagination.page_of', { page: contentQuery.page, total: contentData.total_pages || 1 })}
                            </span>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={contentQuery.page >= (contentData.total_pages || 1)}
                                onClick={() => setContentQuery(prev => ({ ...prev, page: Math.min((contentData.total_pages || 1), prev.page + 1) }))}
                            >
                                {t('admin.buttons.next')}
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900">{t('admin.reports.title')}</h2>
                    <p className="text-zinc-500 font-medium">{t('admin.reports.subtitle')}</p>
                </div>
                <GlassCard className="p-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                        <AlertTriangle />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 mb-2">{t('admin.reports.disabled_title')}</h3>
                    <p className="text-zinc-500 font-medium">{t('admin.reports.disabled_desc')}</p>
                </GlassCard>
            </section>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title={t('admin.modal.participant_title')}
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <div className="text-sm text-zinc-500 font-semibold">{t('admin.users.table.id')}</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedUser.id}</div>
                        <div className="text-sm text-zinc-500 font-semibold">{t('admin.users.table.email')}</div>
                        <div className="text-sm font-bold text-zinc-900">{selectedUser.email}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-zinc-500 font-semibold">{t('admin.labels.status')}</div>
                                <div className="text-sm font-bold">{statusLabels[selectedUser.status] || selectedUser.status}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 font-semibold">{t('admin.labels.last_login')}</div>
                                <div className="text-sm font-bold">{formatDateTime(selectedUser.last_login_at, notAvailable)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 font-semibold">{t('admin.labels.actions_count')}</div>
                                <div className="text-sm font-bold">{selectedUser.metrics?.actionsCount ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 font-semibold">{t('admin.labels.last_activity')}</div>
                                <div className="text-sm font-bold">{formatDateTime(selectedUser.last_activity_at, notAvailable)}</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!resetPasswordInfo}
                onClose={() => setResetPasswordInfo(null)}
                title={t('admin.modal.temp_password_title')}
            >
                {resetPasswordInfo && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-600 font-medium">{t('admin.modal.temp_password_desc')}</p>
                        <div className="p-4 rounded-2xl bg-zinc-100 text-zinc-900 font-black text-center text-lg tracking-widest">
                            {resetPasswordInfo.temp_password}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
