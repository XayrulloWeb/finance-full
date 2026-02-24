import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n'; // Import i18n config
import ErrorBoundary from './components/ErrorBoundary.jsx' // <-- IMPORT

// In development, clear stale SW/caches that can keep old client scripts alive.
if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
                .catch(() => {});
        }

        if ('caches' in window) {
            caches.keys()
                .then((keys) => Promise.all(
                    keys
                        .filter((key) => key.includes('workbox') || key.includes('vite'))
                        .map((key) => caches.delete(key))
                ))
                .catch(() => {});
        }
    });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
