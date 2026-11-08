# Operations runbook

[← Documentation index](README.md)

What to do when something goes wrong during the pilot. Commands run in `apps/api` on the server.

## Health at a glance
- `GET /api/v1/health` (also Admin → Overview → System status): database, cache and **queue**. Queue fails when jobs wait over 5 minutes (no worker) or a job failed in the last 24 hours.
- `php artisan communitycare:preflight`: configuration and readiness.
- `php artisan communitycare:data-quality`: missing or doubtful facility data.

## Backups and restore
- Nightly 01:30 (Manila): `communitycare:backup` writes `storage/app/backups/communitycare-YYYYMMDD-HHMMSS.sql.gz` and keeps the newest 14 (`BACKUP_KEEP`). Copy them off the server.
- Weekly (Sunday 03:00): `communitycare:restore-check` restores the newest backup into a temporary database, compares key tables, and removes it.
- **Restoring for real** (data loss or corruption):
  1. Put the site in maintenance: `php artisan down`.
  2. Make a backup of the current state first: `php artisan communitycare:backup`.
  3. Restore: `gunzip -c storage/app/backups/<file>.sql.gz | mysql -u <user> -p <database>`.
  4. `php artisan migrate --force` (in case the backup predates a deployment), then `php artisan up`.
  5. Tell staff which time the data was restored to; anything after it must be re-entered.

## When a service is down
- **Queue worker stopped**: emails, in-app notifications and audit entries wait (nothing is lost). Restart `php artisan queue:work`; they go out in order. Failed jobs: `php artisan queue:failed`, then `queue:retry all`.
- **Reverb stopped**: the app works; notifications arrive when the bell is opened instead of live. Restart `php artisan reverb:start`.
- **Email provider down**: two-factor email codes cannot arrive. People with an authenticator app or a recovery code can still sign in. Otherwise a system admin resets that person's two-factor (Team → Edit → Reset two-factor) so they can choose the app.
- **PSGC API down**: syncing places fails safely (nothing is changed). Retry later.
- **OpenStreetMap geocoder down**: Locations maps show "could not be loaded"; already-saved areas still show.
- **AI provider (Claude) down or refusing**: the assistant answers from records only (grounded provider). No action needed.

## People
- **Lost phone or no email access** (two-factor): a system admin uses Team → Edit → **Reset two-factor**. The person is signed out everywhere and sets it up again at next sign-in. Facility admins can do this for staff at their facilities.
- **Someone leaves**: Team → Edit → status **Suspended**. They are signed out everywhere immediately.
- **Suspected account misuse**: suspend first, then read Audit log filtered by that person.

## Data fixes
- Wrong facility details reported by the public: facility staff or an admin edits the facility (staff edits need approval; system admin edits go live at once).
- Duplicate facility: Data quality → "Possible duplicate" → unpublish one (Facilities → record → publication).
