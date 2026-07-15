#!/bin/bash
# Бэкапит SQLite базу заявок и вложения.
# Настройка через cron (пример — см. README.md):
#   0 3 * * * /var/www/lab-itis.ru/server/deploy/backup-leads.sh >> /var/log/lab-itis-backup.log 2>&1
set -euo pipefail

SRC_DIR="/var/www/lab-itis.ru/server"
BACKUP_DIR="/var/backups/lab-itis-leads"
DATE="$(date +%Y-%m-%d_%H-%M)"

mkdir -p "$BACKUP_DIR"

sqlite3 "$SRC_DIR/data/leads.db" ".backup '$BACKUP_DIR/leads_$DATE.db'"

if [ -d "$SRC_DIR/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$SRC_DIR" uploads
fi

# Храним локальные копии 30 дней — этого достаточно как страховки между
# ручными/автоматическими выгрузками в offsite-хранилище (см. README.md).
find "$BACKUP_DIR" -name "leads_*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +30 -delete

echo "Backup done: $BACKUP_DIR/leads_$DATE.db, $BACKUP_DIR/uploads_$DATE.tar.gz"
