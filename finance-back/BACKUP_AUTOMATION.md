# 📦 Автоматизация Backup'ов PostgreSQL

## Windows: Task Scheduler

### 1. Подготовка

Убедитесь, что:
- PostgreSQL установлен и `pg_dump` доступен в PATH
- Скрипт `scripts/backup-db.bat` существует
- У вас есть права администратора

### 2. Создание задачи через GUI

1. **Открыть Task Scheduler:**
   - `Win + R` → введите `taskschd.msc`

2. **Создать базовую задачу:**
   - Правой кнопкой на "Task Scheduler Library"
   - "Create Basic Task..."
   
3. **Настройки:**

   **Name:** `Finance DB Backup`  
   **Description:** Ежедневный backup базы данных Finance Empire

   **Trigger:** Daily  
   **Start:** 03:00 AM  
   **Recur every:** 1 day

   **Action:** Start a program  
   **Program/script:**
   ```
   C:\Users\user\WebstormProjects\Finance\finance-back\scripts\backup-db.bat
   ```
   
   **Start in:**
   ```
   C:\Users\user\WebstormProjects\Finance\finance-back
   ```

4. **Дополнительные настройки:**
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - ⚠️ If the task fails, restart every: 10 minutes
   - ⚠️ Attempt to restart up to: 3 times

### 3. Создание через PowerShell (альтернатива)

```powershell
# Запустите PowerShell от администратора

$Action = New-ScheduledTaskAction `
    -Execute "C:\Users\user\WebstormProjects\Finance\finance-back\scripts\backup-db.bat" `
    -WorkingDirectory "C:\Users\user\WebstormProjects\Finance\finance-back"

$Trigger = New-ScheduledTaskTrigger -Daily -At 3am

$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
    -TaskName "Finance DB Backup" `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Description "Daily backup of Finance Empire database"
```

### 4. Проверка

```powershell
# Список задач
Get-ScheduledTask -TaskName "Finance DB Backup"

# Запустить вручную
Start-ScheduledTask -TaskName "Finance DB Backup"

# Проверить результат
Get-ScheduledTaskInfo -TaskName "Finance DB Backup"

# Просмотреть логи
# EventViewer → Windows Logs → Application (фильтр: Task Scheduler)
```

---

## Linux: Cron

### 1. Подготовка

```bash
# Сделать скрипт исполняемым
cd /path/to/finance-back
chmod +x scripts/backup-db.sh

# Протестировать вручную
./scripts/backup-db.sh
```

### 2. Настройка Cron

```bash
# Открыть crontab для редактирования
crontab -e

# Добавить строку (ежедневно в 3:00 AM)
0 3 * * * cd /path/to/finance-back && ./scripts/backup-db.sh >> logs/backup.log 2>&1
```

**Формат cron:**
```
минута час день месяц день_недели команда
  0     3   *     *        *
```

**Примеры:**
```bash
# Каждый день в 3:00
0 3 * * * cd /path/to/finance-back && ./scripts/backup-db.sh

# Каждую неделю в воскресенье в 2:00
0 2 * * 0 cd /path/to/finance-back && ./scripts/backup-db.sh

# Каждые 12 часов
0 */12 * * * cd /path/to/finance-back && ./scripts/backup-db.sh

# В первый день каждого месяца
0 3 1 * * cd /path/to/finance-back && ./scripts/backup-db.sh
```

### 3. Проверка cron

```bash
# Список cron задач
crontab -l

# Проверить логи cron
tail -f /var/log/syslog | grep CRON  # Ubuntu/Debian
tail -f /var/log/cron                # CentOS/RHEL

# Проверить логи backup
tail -f logs/backup.log
```

---

## Docker: Cron Container (опционально)

Если используете Docker, добавьте в `docker-compose.yml`:

```yaml
services:
  backup:
    image: postgres:15
    depends_on:
      - postgres
    environment:
      - PGHOST=postgres
      - PGDATABASE=finance_db
      - PGUSER=postgres
      - PGPASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
      - ./scripts/backup-db.sh:/backup.sh
    command: >
      sh -c "
        echo '0 3 * * * /backup.sh' > /etc/crontabs/root &&
        crond -f -l 2
      "
```

---

## Восстановление из Backup

### Windows

```cmd
cd backups

REM Если файл сжат
REM gunzip backup_20260118_030000.sql.gz

REM Восстановление (ОСТОРОЖНО: удалит текущие данные!)
pg_restore -U postgres -d finance_db -c backup_20260118_030000.sql
```

### Linux

```bash
cd backups

# Распаковать
gunzip backup_20260118_030000.sql.gz

# Восстановление
pg_restore -U postgres -d finance_db -c -v backup_20260118_030000.sql

# Или создать новую БД для теста
createdb finance_db_restored
pg_restore -U postgres -d finance_db_restored -v backup_20260118_030000.sql
```

---

## Тестирование Backup/Restore

```bash
# 1. Создать backup
./scripts/backup-db.sh  # или backup-db.bat

# 2. Создать тестовую БД
createdb finance_db_test

# 3. Восстановить в тестовую БД
cd backups
gunzip -c backup_LATEST.sql.gz | pg_restore -U postgres -d finance_db_test -v

# 4. Проверить данные
psql -U postgres -d finance_db_test -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d finance_db_test -c "SELECT COUNT(*) FROM transactions;"

# 5. Удалить тестовую БД
dropdb finance_db_test
```

---

## Мониторинг Backup'ов

### 1. Скрипт проверки (check-backups.sh)

```bash
#!/bin/bash

BACKUP_DIR="./backups"
DAYS_OLD=1
EMAIL="admin@example.com"

# Найти последний backup
LATEST=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -$DAYS_OLD)

if [ -z "$LATEST" ]; then
    echo "WARNING: No recent backups found!"
    # Отправить email или уведомление
    # mail -s "Backup Alert" $EMAIL <<< "No backups in last $DAYS_OLD days"
    exit 1
else
    echo "✓ Recent backup found: $LATEST"
    exit 0
fi
```

### 2. Добавить в cron проверку (после backup)

```bash
# Crontab
0 3 * * * cd /path/to/finance-back && ./scripts/backup-db.sh
30 3 * * * cd /path/to/finance-back && ./scripts/check-backups.sh
```

---

## Best Practices

1. **Хранение backup'ов:**
   - ✅ Локально (первые 30 дней)
   - ✅ Cloud storage (AWS S3, Google Cloud Storage)
   - ✅ Отдельный сервер

2. **Тестирование restore:**
   - Раз в месяц восстанавливайте backup в тестовую БД
   - Проверяйте целостность данных

3. **Безопасность:**
   - Шифруйте backup'ы при хранении
   - Не храните пароли в crontab (используйте .pgpass)

4. **Мониторинг:**
   - Настройте алерты на отсутствие backup'ов
   - Логируйте все backup операции

---

## Автоматизация через Cloud

### AWS S3

```bash
# Добавить в backup-db.sh после создания backup

# Загрузить на S3
aws s3 cp $BACKUP_FILE.gz s3://finance-backups/$(date +%Y/%m/%d)/

# Удалить локальные backup'ы старше 7 дней
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### Google Cloud Storage

```bash
# После backup
gsutil cp $BACKUP_FILE.gz gs://finance-backups/$(date +%Y/%m/%d)/
```

---

## Troubleshooting

**Проблема:** Backup не создаётся  
**Решение:** Проверить:
```bash
# Права на папку
ls -la backups/

# pg_dump доступен
which pg_dump

# PostgreSQL работает
pg_isready -U postgres
```

**Проблема:** Cron не запускается  
**Решение:**
```bash
# Проверить сервис cron
service cron status

# Перезапустить
service cron restart

# Проверить логи
grep CRON /var/log/syslog
```
