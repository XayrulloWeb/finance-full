# Finance Empire

Finance Empire — это современное приложение для управления личными финансами, построенное на стеке PERN (PostgreSQL, Express, React, Node.js).

## 🚀 Функциональность
- **Дашборд:** Обзор баланса, доходов, расходов и последних транзакций.
- **Транзакции:** Добавление доходов, расходов и переводов с категориями и контрагентами.
- **Аналитика:** Графики и отчеты по категориям и динамике.
- **Цели и Долги:** Управление финансовыми целями и учетом долгов.
- **PWA:** Поддержка установки как приложения на мобильные устройства.
- **AI Ассистент:** Умные советы и категоризация трат (Google Gemini).

## 🛠 Технологии

### Frontend (`finance-front`)
- React 19 + Vite
- TailwindCSS v4
- Zustand (State Management)
- Recharts (Графики)
- Framer Motion (Анимации)
- PWA (Vite Plugin PWA)

### Backend (`finance-back`)
- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT Authentication
- Google Gemini AI (для умных советов)

---

## 📦 Установка и Запуск

### 1. Предварительные требования
- Node.js (v18+)
- PostgreSQL

### 2. Клонирование и установка зависимостей

```bash
# Клонировать репозиторий
git clone <repo-url>
cd Finance

# Установка зависимостей Backend
cd finance-back
npm install

# Установка зависимостей Frontend
cd ../finance-front
npm install
```

### 3. Настройка окружения

Создайте файлы `.env` в папках `finance-back` и `finance-front` на основе примеров.

#### Backend (`finance-back/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
JWT_SECRET="your_super_secret_key"
CLIENT_URL="http://localhost:5173"
GEMINI_API_KEY="your_gemini_key"
```

#### Frontend (`finance-front/.env`)
```env
VITE_API_URL="http://localhost:5000/api"
```

### 4. Запуск в режиме разработки

Откройте два терминала:

```bash
# Терминал 1 (Backend)
cd finance-back
npx prisma migrate dev --name init # Первый запуск (создание БД)
npm run dev

# Терминал 2 (Frontend)
cd finance-front
npm run dev
```

### 5. Сборка для продакшна

```bash
# Frontend
cd finance-front
npm run build
# Результат будет в папке dist
```

## 🔒 Безопасность
- Пароли хешируются с помощью bcrypt.
- JWT токены используются для авторизации.
- Rate Limiting и Helmet настроены на бэкенде.

---

(C) 2025 Finance Empire Platinum
