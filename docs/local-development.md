# Local Development (Herd + DBngin)

[← Documentation index](README.md)

The project runs natively on macOS with **Laravel Herd** (PHP, Composer, `.test` sites) and **DBngin** (MySQL, Redis). Docker is not needed.

## Requirements

| Tool | Used for | Notes |
|---|---|---|
| Laravel Herd | PHP 8.4, Composer, serving the API | Serves `apps/api` at `http://communitycare-api.test` |
| DBngin | MySQL and Redis services | MySQL 8.0+ (9.x works), Redis optional at first |
| Node.js 22+ | Web app | Herd ships Node through its bundled nvm |

## First-time setup

1. **Start MySQL in DBngin** on port `3306` (user `root`, empty password).
2. **Create the databases:**

    ```sh
    php -r '$p=new PDO("mysql:host=127.0.0.1;port=3306","root",""); foreach(["communitycare","communitycare_testing"] as $d){$p->exec("CREATE DATABASE IF NOT EXISTS `$d` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");}'
    ```

3. **Install and migrate the API:**

    ```sh
    cd apps/api
    composer install
    cp .env.example .env && php artisan key:generate   # first time only
    php artisan migrate --seed
    herd link communitycare-api
    ```

4. **Install the web app** (from the repository root):

    ```sh
    npm install
    ```

## Mobile app

See [apps/mobile/README.md](../apps/mobile/README.md). In short: `cd apps/mobile && npm install && cp .env.example .env && npx expo start`, then press `i` for the iOS Simulator.

## Daily workflow

Run each in its own terminal tab:

| Command | Where | Why |
|---|---|---|
| `npm run dev:web` | repository root | Web app on port 5180, opened at **`http://community-care.test`** (admin: `http://community-care.test/admin`). Proxies `/api` to Herd |
| `php artisan queue:listen` | `apps/api` | Runs queued jobs: emails, notifications, the audit log. `listen` reloads code on every job, so code changes apply at once (`queue:work` keeps old code until restarted) |
| `php artisan schedule:work` | `apps/api` | Nightly jobs (stale-record check from phase 4) |

The API itself needs no command: Herd always serves it.

## Local accounts

`php artisan migrate --seed` creates:

| Email | Password | Role | Seeded |
|---|---|---|---|
| `admin@admin.com` | `password` | Super admin (system admin) | Always, by `SuperAdminSeeder`; refused in production unless `SUPER_ADMIN_PASSWORD` is changed |
| `verifier@communitycare.test` | `password` | Verifier | Local only |

Change the super admin with `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `.env`, then run `php artisan db:seed --class=SuperAdminSeeder`.

## Sample data

Small synthetic files (made-up facilities) are in `apps/api/tests/Fixtures/imports`:

```sh
cd apps/api
php artisan communitycare:import psa_psgc tests/Fixtures/imports/psgc_sample.csv --source-version=sample --sync
php artisan communitycare:import doh_nhfr tests/Fixtures/imports/nhfr_sample.csv --source-version=sample --sync
```

Then sign in at the web app, open **Imports**, decide the 3 flagged records and publish.

## Checks

| Check | Command |
|---|---|
| API health | `curl http://communitycare-api.test/api/v1/health` |
| API tests (MySQL `communitycare_testing`) | `cd apps/api && php artisan test --compact` |
| Code style | `cd apps/api && vendor/bin/pint` |
| Web types, tests, build | `npm run typecheck:web && npm run test:web && npm run build:web` |

## Switching cache and queue to Redis

Local development starts with MySQL-backed cache and queue so only one service is required. When you add Redis in DBngin (port `6379`), set these in `apps/api/.env`:

```dotenv
CACHE_STORE=redis
QUEUE_CONNECTION=redis
```

Herd's PHP already includes the `redis` extension. Production should use Redis for both.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Web app shows "API unreachable" | Check `herd links` lists `communitycare-api` and that MySQL is running in DBngin |
| Audit log rows do not appear | Start `php artisan queue:listen`; the listener is queued |
| Emails stopped after a code change / `php artisan queue:failed` lists jobs | A `queue:work` worker is running old code. Stop it, start `php artisan queue:listen`, then `php artisan queue:retry all` |
| `Port 5173 is in use` | Vite picks the next free port automatically; use the URL it prints |
| `npm error Cannot read properties of null (reading 'edgesOut')` | npm bug when adding packages with `-w`; add them to `apps/web/package.json` and run `npm install` |

## AI assistant (phase 6)

1. In the admin console open **Settings** and turn on `features.assistant.enabled`, or use the **AI assistant → Test console**, which works while the switch is off.
2. By default the grounded provider answers (no API key needed). To use Claude, set `ASSISTANT_PROVIDER=claude` and `ANTHROPIC_API_KEY=...` in `apps/api/.env`.
3. `php artisan db:seed` (local) adds three sample knowledge documents. Replace them with reviewed content before launch.

## Web app URL: community-care.test

The Vite dev server runs on a fixed port (5180) and Herd forwards a `.test` name to it. This was set up once with:

```bash
herd proxy community-care http://localhost:5180
```

- Public site: `http://community-care.test` · Admin: `http://community-care.test/admin` · API: `http://communitycare-api.test`
- `apps/api/.env` must list the host for cookie sign-in: `SANCTUM_STATEFUL_DOMAINS=community-care.test,localhost:5180,127.0.0.1:5180` and `FRONTEND_URL=http://community-care.test`.
- Remove the proxy with `herd unproxy community-care`. `http://localhost:5180` keeps working.

## All Philippine places (PSGC)

`php artisan db:seed` (and `migrate:fresh --seed`) loads every region, province, city/municipality and barangay automatically through `GeographySeeder`, in about 40–90 seconds. If the list is already there it skips the download; set `PSGC_SEED_REFRESH=true` to fetch again. Offline, it warns and carries on.

To include the places the API does not list yet (BARMM's Special Geographic Area), download PSA's PSGC publication from psa.gov.ph/classification/psgc in a browser and save it as CSV at `apps/api/storage/app/psgc/psa-psgc.csv` (or set `PSGC_SEED_FILE`). It needs the columns `10-digit PSGC`, `Name` and `Geographic Level`. The next `db:seed` imports it too.

`php artisan communitycare:sync-geography --sync` (or **Locations → Sync from PSGC**) downloads every region, province, city/municipality and barangay from the public PSGC API (PSA data) and imports it as an audited batch: 17 regions, 81 provinces, ~1,650 cities/municipalities and ~42,000 barangays in about 90 seconds. Existing places are updated by PSGC code, so facility links are kept. 63 barangays in BARMM's Special Geographic Area are skipped because the API does not yet list their new municipalities; importing PSA's own PSGC file with the `psa_psgc` CSV source covers them.

## Staying signed in

The sign-in form's **Keep me signed in ** sets a remember-me cookie (`REMEMBER_ME_DAYS`, default 365). Without it the session ends after `SESSION_LIFETIME` minutes of inactivity. A password reset or suspension ends remembered sign-ins on every device.

## Debugging with Laravel Telescope

Telescope is installed as a **dev dependency** and loads only when `APP_ENV=local` (see `AppServiceProvider::register`), so production never runs it.

- Dashboard: **`http://communitycare-api.test/telescope`** (requests, queries, jobs, events, mail, notifications, exceptions, logs, cache).
- Passwords, tokens, cookies and `Authorization` headers are shown as `********`. Assistant question requests (`/assistant/messages`, `/admin/assistant/preview`) are not recorded at all, because their search queries contain the question's words and questions are never stored.
- Turn it off locally with `TELESCOPE_ENABLED=false`. Tests always run with it off (`phpunit.xml`).
- Entries pile up; clear them with `php artisan telescope:clear`, or prune old ones with `php artisan telescope:prune --hours=48`.
- If `/telescope` shows 404 after installing, clear the route cache: `php artisan route:clear`.

## Maps on the Locations screen

Selecting a region, province, city or barangay shows it on an OpenStreetMap map with its boundary and its facilities. The server looks the area up once with OpenStreetMap's Nominatim geocoder (free, at most one request per second, identifying User-Agent `GEOCODER_USER_AGENT`) and caches the result in `area_geometries`, so later views are instant. Areas OpenStreetMap does not know are retried after 30 days; meanwhile their parent area is shown and marked approximate. For production volumes switch `GEOCODER_URL` to a commercial or self-hosted geocoder (the `AreaGeocoder` contract makes this a new class, not a rewrite).

## Real-time notifications (Laravel Reverb)

Live notifications need two more processes (Herd and the web dev server stay as before):

```bash
cd apps/api && php artisan reverb:start     # WebSocket server on port 8080
cd apps/api && php artisan queue:listen     # sends emails and in-app notifications (reloads code changes)
```

- The web app reads `apps/web/.env.local` (`VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME`). Copy the values from `apps/api/.env`. Restart `npm run dev:web` after changing it.
- Without Reverb the app still works: the bell loads when opened and the dot next to "Notifications" stays grey.
- Each user listens on the private channel `users.{publicId}`, authorised at `/api/broadcasting/auth`.

## Booking pilot (local)

1. Settings → turn on `features.booking.enabled`.
2. Pick a facility in the top bar → Appointments → Schedule → switch on "This facility accepts requests" → **Add times**.
3. On the public site, open that facility, create a patient account, and request a time.
4. Facility staff (e.g. `staff@communitycare.test` / `password` for Antipolo City Health Office) confirm it under Appointments → Requests. With Reverb running, the request appears live.

## Two-factor sign-in locally

Admins, facility admins and verifiers must set up two-factor sign-in at their next sign-in. Locally emails go to `apps/api/storage/logs/laravel.log` (`MAIL_MAILER=log`). Search it for "is your CommunityCare" to find the code. You can also use an authenticator app.

To skip it on your own machine only, set `TWO_FACTOR_ENFORCED=false` in `apps/api/.env`, or turn off **Settings → Require two-factor**. Never do either in production.

Local accounts: `admin@admin.com`, `verifier@communitycare.test`, `facility-admin@communitycare.test` (Ana Reyes, Antipolo City Health Office) and `staff@communitycare.test` (Rico Santos). The password for all of them is `password`.

## Pilot tooling

- `php artisan communitycare:preflight`: go-live checks (expect FAILs locally: no HTTPS, debug on).
- `php artisan communitycare:data-quality`: data-quality summary. Details are under Admin → Data quality.
- `php artisan communitycare:backup` and `php artisan communitycare:restore-check`: backups need `MYSQLDUMP_PATH` and `MYSQL_PATH` (DBngin: `/Users/Shared/DBngin/mysql/<version>/bin/`).
