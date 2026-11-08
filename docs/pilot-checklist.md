# Pilot checklist

[← Documentation index](README.md)

Use this before switching on the limited pilot. Every item should be ticked or consciously accepted by the project lead.

## 1. Server
- [ ] `php artisan communitycare:preflight` passes with no FAIL. Review every WARN.
- [ ] HTTPS on the web app, the API and the Reverb (real-time) server.
- [ ] `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_SECURE_COOKIE=true`, `TELESCOPE_ENABLED=false`.
- [ ] `REMEMBER_ME_DAYS=30` or less.
- [ ] Real email delivery configured (two-factor email codes, appointment and invite emails depend on it).
- [ ] `php artisan queue:work` and `php artisan reverb:start` run under a process manager (restart on crash).
- [ ] Every deploy runs `php artisan queue:restart`, so workers pick up the new code. Otherwise they keep running the old code.
- [ ] The scheduler runs every minute (`php artisan schedule:run`): nightly backup, weekly restore test, daily stale check.

## 2. Accounts and access
- [ ] The super admin password (`admin@admin.com`) is changed, and the email is a real mailbox.
- [ ] Every admin, facility admin and verifier has two-factor sign-in on (the console requires it).
- [ ] Each person has the smallest role that works: facility staff and facility admins are assigned only to their pilot facilities.
- [ ] Team & roles → access review shows no unused accounts.

## 3. Data
- [ ] All Philippine places loaded (`db:seed` or Locations → Sync from PSGC). Optional: PSA file for the Special Geographic Area.
- [ ] Data quality → every pilot facility has no issues: map position, public phone, opening hours, listed services, current verification.
- [ ] The DOH NHFR import columns were checked against a real export (see `config/communitycare.php`).
- [ ] Health programs shown to the public are current and have a source.

## 4. Booking pilot (if used)
- [ ] Only agreed facilities are opted in (Appointments → Schedule → "accepts requests").
- [ ] Their staff know how to confirm or decline within a working day ([staff guide](staff-guide.md)).
- [ ] Appointment times are published at least two weeks ahead.
- [ ] Settings → `features.booking.enabled` turned on last.

## 5. Recovery
- [ ] `php artisan communitycare:backup` works and backups are copied off the server.
- [ ] `php artisan communitycare:restore-check` passes.
- [ ] The [operations runbook](operations.md) is shared with whoever is on call.

## 6. Accessibility and devices
- [ ] Automated scan clean (axe-core: 0 violations on every page; no horizontal scrolling at 390 px). Re-run after big UI changes.
- [ ] A person has tried the public search, a facility page and booking on a real Android phone and an iPhone.

## 7. Go / no-go
- [ ] Project lead sign-off: ______________________  Date: __________
