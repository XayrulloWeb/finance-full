import api from '../api/axios';

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
        const register = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        // Check if already subscribed
        let subscription = await register.pushManager.getSubscription();

        if (!subscription) {
            // Get public key from backend
            const { data } = await api.get('/push/key');
            const publicKey = urlBase64ToUint8Array(data.publicKey);

            // Subscribe
            subscription = await register.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey
            });

            // Send to backend
            await api.post('/push/subscribe', subscription);
            return true;
        }
        return true;
    } catch (error) {
        console.error('Push Subscription Error:', error);
        return false;
    }
};
