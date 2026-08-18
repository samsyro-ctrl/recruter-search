#!/bin/bash

# Daily backup script for recruter-search
# Runs at 2 AM via cron
# Keeps 14 days of backups

BACKUP_DIR="/opt/recruter-search/backups"
DB_FILE="/opt/recruter-search/memorie.db"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/memorie-$DATE.db"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Create backup using SQLite VACUUM INTO
sqlite3 "$DB_FILE" "VACUUM INTO '$BACKUP_FILE';"

if [ -f "$BACKUP_FILE" ]; then
  echo "✓ Backup created: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"

  # Verify backup
  sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) as rows FROM cautari;" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✓ Backup verified successfully"
  else
    echo "✗ Backup verification failed"
    exit 1
  fi
else
  echo "✗ Backup creation failed"
  exit 1
fi

# Cleanup old backups (keep 14 days)
find "$BACKUP_DIR" -name "memorie-*.db" -type f -mtime +14 -delete
echo "✓ Old backups cleaned (kept 14 days)"

# Log to syslog
logger -t recruter-backup "Daily backup completed: $BACKUP_FILE"
