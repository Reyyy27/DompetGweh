# DompetGweh

DompetGweh is a Laravel + React personal-finance app. Accounts have private transactions, recurring-income schedules, Paylater bills, opening balances, and a per-account color palette.

## Local development

Requirements: PHP 8.2+, Composer, Node.js, and npm.

```sh
composer install
copy .env.example .env
php artisan key:generate
npm install
php artisan migrate
npm run build
php artisan serve
```

For frontend development with Vite hot reload, run `npm run dev` in a second terminal.

## Accounts and privacy

- The first account can register without an invitation. After that, registration requires a single-use invitation link, which expires after seven days.
- Create an invitation from **Pengaturan → Undang pengguna**. Each account sees and manages only its own financial data.
- Passwords must be at least 12 characters.
- The database seeder intentionally creates no demo account. An older installation may still contain the former `test@example.com` demo user; remove or secure that account before exposing the app publicly.
- Existing transactions without an owner are claimed by the first account only when the database has no users. If a database already has accounts, back up the database and assign any legacy orphan transactions to the correct user before deployment; do not expose the app while they remain unassigned.

## Deploying to a VPS

1. Deploy the project and install production dependencies (`composer install --no-dev --optimize-autoloader` and `npm ci`).
2. Configure `.env` for production:

   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-domain.example
   APP_TIMEZONE=Asia/Jakarta
   SESSION_SECURE_COOKIE=true
   ```

   Generate a unique `APP_KEY`. Use a persistent database and session store; SQLite is suitable only when its file is on persistent storage and is included in backups. Set database credentials and `SESSION_DOMAIN` only when your deployment requires them.

3. Configure the web server document root to the project's `public` directory, enable HTTPS, and grant the web user write access to `storage` and `bootstrap/cache`.
4. Run deployment commands:

   ```sh
   php artisan migrate --force
   npm run build
   php artisan optimize
   ```

5. Before making the site public, create the first account under restricted access and verify that no demo account or unassigned legacy records remain. Share invitations with the intended users only.
6. Configure cron to invoke Laravel Scheduler every minute:

   ```cron
   * * * * * cd /path/to/DompetGweh && php artisan schedule:run >> /dev/null 2>&1
   ```

   The scheduler creates due recurring-income transactions at 00:05 in the configured application timezone, including while nobody is signed in. Dates from the 29th to 31st are clamped to the last day of shorter months.
7. Back up the database and application key securely and test restoring backups. Use a persistent disk/database rather than an ephemeral VPS filesystem.

## Recurring income

Add separate schedules for each monthly payment, such as day 1 and day 25. The server-side scheduler records each due schedule once per account and month. Turning a schedule off prevents future records but does not delete transactions already created.

## Tests

```sh
php artisan test
npm run build
```
