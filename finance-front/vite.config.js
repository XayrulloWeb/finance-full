// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          utils: ['date-fns', 'axios', 'zustand'],
          export_tools: ['jspdf', 'jspdf-autotable', 'xlsx']
        }
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // Автоматически обновляет приложение при изменениях
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Кэшируем все ресурсы для оффлайна
        globIgnores: ['**/assets/export_tools-*.js'], // Heavy export libs are loaded on-demand
      },
      manifest: {
        name: 'Finance Empire',
        short_name: 'Finance',
        description: 'Управляй деньгами как профи',
        theme_color: '#4338ca', // Цвет шапки (Indigo 600)
        background_color: '#f3f4f6',
        display: 'standalone', // КЛЮЧЕВОЕ: Убирает адресную строку браузера
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Чтобы иконка красиво смотрелась в кружочках/квадратах
          }
        ]
      }
    })
  ],
})
