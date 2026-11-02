#!/usr/bin/env bash

mkdir -p /var/www/html/database
if [ ! -f /var/www/html/database/database.sqlite ]; then
    touch /var/www/html/database/database.sqlite
fi
chown -R www-data:www-data /var/www/html/database
chmod -R 775 /var/www/html/database
/usr/bin/php /var/www/html/artisan migrate --force --no-ansi
