# Security, Privacy and Compliance

[← Documentation index](README.md)

The Philippine Data Privacy Act of 2012 (Republic Act No. 10173) treats health information as sensitive personal information. Consult the National Privacy Commission and qualified counsel before processing personal or health data. This document is an engineering plan, not legal advice or a compliance certification.

## Minimum security baseline

- HTTPS for all traffic; secure cookies and CSRF protection for cookie-based web authentication.
- Hash passwords with the framework's secure hashing; never store plaintext passwords.
- Require two-factor authentication for verifiers and administrators.
- Apply least privilege, role-based Policies, ownership checks, and facility assignment checks.
- Validate input, use parameterized ORM queries, rate-limit sensitive endpoints, and prevent mass assignment.
- MySQL: private network only, TLS connections, separate least-privilege database users for the app and for migrations.
- Keep secrets outside source control; rotate credentials and separate environments.
- Maintain tested backups, a recovery procedure, dependency updates, and an incident response plan.
- Audit high-risk administrative changes; redact tokens, passwords, and personal contact details from logs and event payloads.
- Define privacy notices, lawful basis, retention and deletion rules, access/correction processes, and data-sharing arrangements.
- Assess third-party providers and cross-border data handling before sharing personal data.
- Collect the minimum personal data necessary; the public directory works without an account, and `usage_events` are anonymous.

## Clinical-data boundary

Do not include diagnoses, prescriptions, lab results, or full medical histories in the initial MVP. If these are later needed, treat them as a separate clinical-record system with its own governance, privacy review, access controls, auditability, retention policies, and clinical workflows.

## Emergency boundary

The directory must not imply that a facility is open or can receive an emergency patient unless the information is current and verified. Label data freshness clearly and direct emergencies to 911.

## Session length (as built)

- Web sessions end after `SESSION_LIFETIME` (120 minutes) of inactivity.
- "Keep me signed in" (ticked by default) issues Laravel's remember-me cookie for `REMEMBER_ME_DAYS` (365). It is HttpOnly and tied to the user's `remember_token`.
- Resetting a password or suspending an account rotates `remember_token` and deletes API tokens, so every remembered device is signed out.
- Review before launch: a year is long for an account that can publish health information. Consider 30 days for production, and requiring two-factor authentication before remember-me is allowed for staff.

## Two-factor sign-in (as built, phase 8)

- **Methods:**
  - **Email code:** 6 digits, valid 10 minutes, 5 tries, a new code at most every 30 s. Stored only as a keyed hash.
  - **Authenticator app:** TOTP (RFC 6238), secret encrypted at rest. A code can't be reused.
  - **Recovery codes:** 8 one-time codes, stored hashed.
- **Who:** required for system admins, facility admins and verifiers (`security.require_mfa_for_staff`). Until it's on, the admin API answers `403 two_factor_setup_required`. Facility staff and patients may turn it on.
- **Sign-in:** password → `two_factor_required` (web: session; token clients: a 5-minute challenge id) → `POST /auth/two-factor` with `code` or `recovery_code`.
- **Changes:** setup, new recovery codes and turning it off need the current password. An admin reset (lost phone) also signs the person out everywhere. Everything is audited (`user.two_factor_*`).
- **Switch:** `TWO_FACTOR_ENFORCED=false` turns enforcement off for a whole environment (tests). Never use it in production; `preflight` fails if it's off.

## Other hardening (phase 8)

- **API response headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive `Content-Security-Policy` and `Permissions-Policy`, and HSTS over HTTPS.
- **Permission before validation:** forms check permission before validating input, so callers without access learn nothing about the expected fields.
- **`RouteProtectionTest`:** walks the live route table, so a new unprotected admin route fails the build.
- **`communitycare:preflight`:** blocks go-live on debug mode, missing HTTPS, insecure cookies, the default super admin password, 2FA enforcement off, Telescope on in production, or Reverb without TLS.

## Remember this device (two-factor)

After a correct two-factor code, people can tick **Remember this device for 30 days**. That browser or phone then signs in with the password only.

- **Storage:** the web keeps an encrypted, HTTP-only cookie (`cc_trusted_device`); the app keeps the secret in secure storage. The server stores only a SHA-256 hash (`trusted_devices`).
- **New devices:** a new device, or anyone with only the password, still needs the code.
- **Forgetting devices:** every remembered device is forgotten when the password is changed or reset, when two-factor is turned off or reset by an admin, or when the account is suspended. People can also press **Forget all devices** on their account page.
- **Duration:** set by `TWO_FACTOR_TRUSTED_DEVICE_DAYS` (default 30).
