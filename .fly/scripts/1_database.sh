#!/usr/bin/env bash

DB_PATH="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
DB_DIRECTORY="$(dirname "$DB_PATH")"
BACKUP_DIRECTORY="${DB_BACKUP_PATH:-/var/www/html/storage/app/private/backups}"

mkdir -p "$DB_DIRECTORY" "$BACKUP_DIRECTORY"
if [ ! -f "$DB_PATH" ]; then
    touch "$DB_PATH"
fi
chown -R www-data:www-data "$DB_DIRECTORY" "$BACKUP_DIRECTORY"
chmod 775 "$DB_DIRECTORY" "$BACKUP_DIRECTORY"
chmod 660 "$DB_PATH"
find "$BACKUP_DIRECTORY" -type f -exec chmod 660 {} \;
/usr/bin/php /var/www/html/artisan migrate --force --no-ansi
