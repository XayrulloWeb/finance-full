import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFinanceStore } from './store/useFinanceStore';
import ToastProvider from './components/ui/ToastProvider';
import Layout from './components/Layout';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy Pages
const Analytics = lazy(() => import('./pages/Analytics'));
const Debts = lazy(() => import('./pages/Debts'));
const Counterparties = lazy(() => import('./pages/Counterparties'));
const Settings = lazy(() => import('./pages/Settings'));
const History = lazy(() => import('./pages/History'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Goals = lazy(() => import('./pages/Goals'));
const Insights = lazy(() => import('./pages/Insights'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const FullScreenLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] text-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
);

export default function App() {
    const user = useFinanceStore(s => s.user);
    const checkUser = useFinanceStore(s => s.checkUser);
    const isAuthChecked = useFinanceStore(s => s.isAuthChecked);
    const settings = useFinanceStore(s => s.settings);

    // Theme Effect
    useEffect(() => {
        if (settings.dark_mode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [settings.dark_mode]);

    // Auth Check Effect (Run once on mount)
    useEffect(() => {
        checkUser();
    }, [checkUser]);

    if (!isAuthChecked) return <FullScreenLoader />;

    return (
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    {!user && (
                        <>
                            <Route path="/forgot-password" element={<ForgotPassword onBackToLogin={() => window.location.href = '/'} />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="*" element={<Auth />} />
                        </>
                    )}

                    {/* Authenticated Routes */}
                    {user && (
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="analytics" element={<Suspense fallback={<FullScreenLoader />}><Analytics /></Suspense>} />
                            <Route path="debts" element={<Suspense fallback={<FullScreenLoader />}><Debts /></Suspense>} />
                            <Route path="counterparties" element={<Suspense fallback={<FullScreenLoader />}><Counterparties /></Suspense>} />
                            <Route path="recurring" element={<Suspense fallback={<FullScreenLoader />}><Recurring /></Suspense>} />
                            <Route path="history" element={<Suspense fallback={<FullScreenLoader />}><History /></Suspense>} />
                            <Route path="settings" element={<Suspense fallback={<FullScreenLoader />}><Settings /></Suspense>} />
                            <Route path="goals" element={<Suspense fallback={<FullScreenLoader />}><Goals /></Suspense>} />
                            <Route path="insights" element={<Suspense fallback={<FullScreenLoader />}><Insights /></Suspense>} />
                            <Route path="calendar" element={<Suspense fallback={<FullScreenLoader />}><Calendar /></Suspense>} />
                            <Route path="notifications" element={<Suspense fallback={<FullScreenLoader />}><Notifications /></Suspense>} />
                            <Route path="admin" element={user?.role === 'admin' ? <Suspense fallback={<FullScreenLoader />}><AdminDashboard /></Suspense> : <Navigate to="/" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    )}
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    );
}

