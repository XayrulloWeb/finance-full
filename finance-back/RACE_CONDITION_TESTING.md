# 🧪 Race Condition Testing Guide

## Проблема

При одновременных транзакциях (например, 2 пользователя или 2 устройства создают расход с одного счёта) может возникнуть **race condition**:

```
Баланс: 1000₽

Транзакция 1: читает 1000₽ → вычитает 600₽ → записывает 400₽
Транзакция 2: читает 1000₽ → вычитает 200₽ → записывает 800₽

Результат: баланс 800₽ (должно быть 200₽) ❌
```

## Решение

Используем **SELECT FOR UPDATE** - блокировка строки на время транзакции:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = '...' FOR UPDATE; -- Блокируем
-- Другие запросы ждут
UPDATE accounts SET balance = ... WHERE id = '...';
COMMIT; -- Разблокируем
```

## Тестирование

### 1. Создание тестового аккаунта

```bash
# Запустите сервер
npm run dev

# В другом терминале - создайте аккаунт для теста
curl -X POST http://localhost:5000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Race Account",
    "currency": "UZS",
    "color": "#ff0000",
    "icon": "🧪",
    "balance": 100000
  }'

# Сохраните account_id из ответа
```

### 2. Тест на Race Condition

```bash
# 10 одновременных транзакций по 1000₽
curl -X POST http://localhost:5000/api/test/race-condition \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "amount": 1000
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "results": {
    "concurrent": 10,
    "amountEach": 1000,
    "totalDeducted": 10000,
    "finalBalance": 90000,  // 100000 - 10000
    "duration": "150ms",
    "avgPerTx": "15.00ms"
  }
}
```

### 3. Проверка логов

```bash
tail -f logs/combined.log
```

Должны увидеть:
```json
{
  "level": "debug",
  "message": "Balance updated",
  "accountId": "...",
  "oldBalance": 100000,
  "increment": -1000,
  "newBalance": 99000,
  "type": "expense"
}
```

### 4. Тест на Deadlock (опционально)

```bash
# Создайте второй аккаунт, затем:
curl -X POST http://localhost:5000/api/test/deadlock \
  -H "Content-Type: application/json" \
  -d '{
    "account1Id": "ACCOUNT_1_ID",
    "account2Id": "ACCOUNT_2_ID",
    "amount": 500
  }'
```

**Возможные результаты:**
- ✅ `"success": true` - deadlock не произошёл (PostgreSQL обработал)
- ⚠️ `"isDeadlock": true` - deadlock обнаружен и залогирован

## Load Testing (Опционально)

Для серьёзного теста используйте Apache Bench или k6:

```bash
# Установите Apache Bench
# Windows: chocolatey install apache-httpd
# Linux: apt install apache2-utils

# 100 запросов, 10 одновременных
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:5000/api/test/race-condition
```

`payload.json`:
```json
{
  "accountId": "YOUR_ACCOUNT_ID",
  "amount": 100
}
```

## Проверка результатов

```sql
-- Подключитесь к PostgreSQL
SELECT id, name, balance FROM accounts WHERE id = 'YOUR_ACCOUNT_ID';
```

**Формула проверки:**
```
Ожидаемый баланс = Начальный - (Количество транзакций × Сумма)
```

Если балансы не совпадают - значит есть race condition! ⚠️

## Отключение тестовых endpoints

В production тестовые routes автоматически отключены:

```javascript
// routes/index.js
if (process.env.NODE_ENV !== 'production') {
    router.use('/test', testRoutes); // Только в dev
}
```

## Мониторинг

После внедрения SELECT FOR UPDATE:
- ✅ Race conditions должны исчезнуть
- ⚠️ Возможны редкие deadlock'и (PostgreSQL автоматически retry)
- 📊 Небольшое увеличение времени транзакции (10-20ms)

Логируйте в Sentry если видите частые deadlock'и - возможно нужна оптимизация порядка блокировок.
