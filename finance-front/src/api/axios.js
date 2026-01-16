import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Default to local for dev
});

// Автоматически подставляем токен в каждый запрос
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Автоматический логаут при 401 (токен протух или юзер удален)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/auth') {
                window.location.href = '/auth'; // Жесткий редирект
            }
        }
        return Promise.reject(error);
    }
);

export default api;