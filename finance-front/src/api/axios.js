import axios from 'axios';
import i18n from '../i18n';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Default to local for dev
});

// Автоматически подставляем токен в каждый запрос
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const lang = i18n.language || 'ru';
    config.headers['Accept-Language'] = lang;
    config.headers['X-App-Lang'] = lang;
    return config;
});

// Автоматический логаут при 401 (токен протух или юзер удален)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Не делаем жесткий редирект, так как это ломает UX при временных ошибках.
            // Просто очищаем токен. При следующем запросе userSlice сам увидит, что токена нет или 401.
            // Но лучше даже токен не удалять тут, а дать userSlice решить.
            // localStorage.removeItem('token'); 

            // Dispatch event so userSlice can listen? Or just do nothing and let the caller handle it.
            // Let's just return 401/403 to the caller.
        }
        return Promise.reject(error);
    }
);

export default api;
