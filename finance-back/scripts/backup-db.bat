@echo off
REM =================================================================
REM PostgreSQL Database Backup Script for Finance Empire (Windows)
REM =================================================================

setlocal

REM Configuration
set DB_NAME=finance_db
set DB_USER=postgres
set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.sql

echo ========================================
echo Finance Empire DB Backup
echo ========================================

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Perform backup
echo Backing up database: %DB_NAME%
pg_dump -U %DB_USER% -d %DB_NAME% -F c -b -v -f "%BACKUP_FILE%"

if %errorlevel% == 0 (
    echo [SUCCESS] Backup completed: %BACKUP_FILE%
    
    REM Cleanup old backups (older than 30 days)
    forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" 2>nul
    
) else (
    echo [ERROR] Backup failed!
    exit /b 1
)

echo ========================================
endlocal
