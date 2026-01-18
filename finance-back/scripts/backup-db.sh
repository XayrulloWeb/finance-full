#!/bin/bash

# =================================================================
# PostgreSQL Database Backup Script for Finance Empire
# =================================================================

# Configuration from environment or defaults
DB_NAME=${DATABASE_NAME:-finance_db}
DB_USER=${DATABASE_USER:-postgres}
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Finance Empire DB Backup${NC}"
echo -e "${GREEN}========================================${NC}"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup using custom format (-F c) for better compression
echo "Backing up database: $DB_NAME"
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Compress the backup
    echo "Compressing backup..."
    gzip -f $BACKUP_FILE
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    echo -e "${GREEN}✓ Backup completed successfully!${NC}"
    echo "File: $BACKUP_FILE.gz"
    echo "Size: $BACKUP_SIZE"
    
    # Delete backups older than 30 days
    echo "Cleaning up old backups (>30 days)..."
    find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
    
    BACKUP_COUNT=$(ls -1 $BACKUP_DIR/*.sql.gz 2>/dev/null | wc -l)
    echo "Total backups: $BACKUP_COUNT"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
