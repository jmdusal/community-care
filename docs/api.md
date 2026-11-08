# API Design

[← Documentation index](README.md)

## 9.1 Conventions

- All endpoints are prefixed with `/api/v1` and return JSON.
- Public directory endpoints need no account; protected operations require authentication and a Policy check.
- IDs in URLs are public ULIDs. Dates are ISO 8601 with offset.
- List endpoints are paginated with `page` and `per_page` (maximum from the `api.max_page_size` setting, default 50).
- Errors always use the same error object ([Section 9.8](api.md)).

## 9.2 Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/facilities | Search, filter, and paginate published facilities. |
| GET | /api/v1/facilities/{id} | Facility detail and verification metadata. |
| GET | /api/v1/facilities/{id}/services | Services listed for a facility. |
| GET | /api/v1/facilities/{id}/hours | Regular hours and upcoming exceptions. |
| GET | /api/v1/services | Browse service categories. |
| GET | /api/v1/locations/regions | List regions. |
| GET | /api/v1/locations/provinces | Filter provinces by region. |
| GET | /api/v1/locations/cities | Filter cities/municipalities. |
| GET | /api/v1/locations/barangays | Filter barangays. |
| GET | /api/v1/health-programs | Published public programs. |
| GET | /api/v1/health-programs/{id} | Program details. |
| POST | /api/v1/assistant/messages | Ask the public information assistant (later phase). |

## 9.3 Facility search parameters

- `q`: facility name or address (full-text).
- `region_code`, `province_code`, `city_code`, `barangay_code`: geographic filters (PSGC).
- `type`: facility type; `service`: service category.
- `lat`, `lng`, `radius_km`: nearby search; coordinates validated, radius capped.
- `verified_only`: restrict to verified records.
- `page`, `per_page`: pagination with an enforced maximum.

Example: `GET /api/v1/facilities?city_code=0405802000&service=immunization&page=1`

## 9.4 Authentication endpoints

Decision: **Laravel Sanctum**. The web app uses a cookie-based session with CSRF protection; the mobile app uses personal access tokens kept in secure device storage.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/v1/auth/register | Create an account. |
| POST | /api/v1/auth/login | Authenticate (rate-limited). |
| POST | /api/v1/auth/logout | End session or revoke current token. |
| GET | /api/v1/me | Current user profile, roles, and assigned facilities. |
| POST | /api/v1/auth/forgot-password | Request password reset. |
| POST | /api/v1/auth/verify-email | Verify email if enabled. |

## 9.5 Administration endpoints

Every admin list and statistics endpoint accepts an optional `facility_id` (and `region_code`) to scope the result. The API checks that the caller may see that scope; facility staff asking for an unassigned facility receive `403`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/admin/stats | Dashboard counts and trends (cached), optionally scoped. |
| GET | /api/v1/admin/facilities | All records including drafts and unpublished, with filters. |
| GET | /api/v1/admin/facilities/{id} | Full record with provenance and history. |
| POST | /api/v1/admin/facilities | Create a facility record (draft). |
| PATCH | /api/v1/admin/facilities/{id} | Propose an edit (creates a change request). |
| POST | /api/v1/admin/facilities/{id}/submit-verification | Submit a record for review. |
| GET | /api/v1/admin/review-queue | Pending change requests, import flags, stale records. |
| POST | /api/v1/admin/change-requests/{id}/approve | Approve and publish (four-eyes enforced). |
| POST | /api/v1/admin/change-requests/{id}/reject | Reject with a required reason. |
| GET | /api/v1/admin/import-batches | Batch history. |
| POST | /api/v1/admin/import-batches | Start an authorized import into staging. |
| GET | /api/v1/admin/import-batches/{id} | Batch status, step, and counts. |
| GET | /api/v1/admin/import-batches/{id}/records | Staged records, filterable by flag. |
| POST | /api/v1/admin/import-batches/{id}/publish | Publish approved staged records. |
| GET | /api/v1/admin/audit-logs | Filter by actor, action, resource, date. |
| GET, POST | /api/v1/admin/users | List and invite users. |
| PATCH | /api/v1/admin/users/{id} | Change roles, facility assignments, or status. |
| GET, PATCH | /api/v1/admin/settings | Read and update typed settings. |
| GET, POST, PATCH | /api/v1/admin/health-programs | Manage programs and participating facilities. |
| GET, POST, PATCH | /api/v1/admin/knowledge-documents | Manage approved assistant sources.

## 9.6 Appointment endpoints (later phase)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/facilities/{id}/availability | Available slots. |
| POST | /api/v1/appointments | Request an appointment (idempotency key required). |
| GET | /api/v1/me/appointments | List own appointments. |
| GET | /api/v1/appointments/{id} | View an authorized appointment. |
| POST | /api/v1/appointments/{id}/cancel | Cancel or request cancellation. |
| POST | /api/v1/staff/appointments/{id}/confirm | Confirm a booking. |
| POST | /api/v1/staff/appointments/{id}/complete | Mark completed. |

## 9.7 API contract rules

- Use appropriate HTTP status codes and the standard error object.
- Validate all query and body inputs; rate-limit login, search, and AI endpoints (limits come from `settings`).
- Never trust client-supplied role, owner, facility assignment, price, or booking status.
- Use API Resources so internal fields (for example `review_notes`) never reach public endpoints.
- Document pagination, sorting, filters, and the deprecation/versioning policy in the OpenAPI file.
- Use idempotency keys for retry-sensitive booking operations.

## 9.8 Response examples

**Paginated list** (`GET /api/v1/facilities`)

```json
{
  "data": [
    {
      "id": "01J8K7ZQ4M9R2T6V8X0B3C5D7F",
      "name": "Quezon City RHU 3",
      "type": { "slug": "rural-health-unit", "name": "Rural Health Unit" },
      "address": "Quezon City, NCR",
      "location": { "lat": 14.6760, "lng": 121.0437 },
      "verification": {
        "status": "verified",
        "verified_at": "2026-10-30T10:15:00+08:00",
        "notice": "Platform review status, not a license or accreditation."
      },
      "source": { "name": "DOH NHFR", "checked_at": "2026-11-07T09:12:00+08:00" }
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1842, "last_page": 93 },
  "links": { "next": "/api/v1/facilities?page=2", "prev": null }
}
```

**Error** (all errors share this shape)

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some fields are invalid.",
    "fields": { "radius_km": ["Must be 50 or less."] },
    "request_id": "req_01J8M2..."
  }
}
```

| Status | `code` | When |
|---|---|---|
| 401 | `unauthenticated` | No valid session or token. |
| 403 | `forbidden` | Authenticated but not allowed (for example an unassigned facility). |
| 404 | `not_found` | Resource does not exist or is not visible to the caller. |
| 409 | `conflict` | Self-approval attempt or a stale change request. |
| 422 | `validation_failed` | Input failed validation. |
| 429 | `rate_limited` | Too many requests; includes `retry_after`. |

## Implemented endpoints (phases 1–3)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | /api/v1/health | public | Database and cache checks |
| GET | /api/v1/facilities | public, `throttle:search` | `q`, `region_code`, `province_code`, `city_code`, `barangay_code`, `type`, `service`, `lat`+`lng`+`radius_km`, `verified_only`, `page`, `per_page` |
| GET | /api/v1/facilities/{id} | public | Published only; includes contacts, hours, exceptions, services, sources |
| GET | /api/v1/facilities/{id}/services, /hours | public | |
| POST | /api/v1/facilities/{id}/events | public | `{"event": "call_click" \| "directions_click"}`, anonymous counts |
| GET | /api/v1/services, /api/v1/facility-types | public | Catalogs with published-facility counts |
| GET | /api/v1/locations/regions, /provinces, /cities, /barangays | public | PSGC lists |
| POST | /api/v1/auth/login | public, `throttle:login` | Web: cookie session (after `GET /sanctum/csrf-cookie`); mobile: `device_name` → token |
| POST | /api/v1/auth/logout · GET /api/v1/me | signed in | |
| GET, PATCH | /api/v1/admin/settings | system admin | PATCH body: `{"settings": [{"key", "value"}]}` |
| GET | /api/v1/admin/import-sources | admin, verifier | |
| GET, POST | /api/v1/admin/import-batches | admin, verifier | POST is multipart: `source`, `file`, `source_version`, `usage_terms`, `terms_recorded` → 202 |
| GET | /api/v1/admin/import-batches/{id} · /records | admin, verifier | Records filter: `flagged`, `match_status`, `decision` |
| POST | /api/v1/admin/import-batches/{id}/records/{record}/decision | admin, verifier | `{"decision": "approved" \| "rejected", "reason"}` (reason required to reject) |
| POST | /api/v1/admin/import-batches/{id}/publish | admin, verifier | 409 `conflict` while flagged records are pending |
| GET | /api/v1/admin/locations/coverage | staff | `level`, `parent_code` |

## Implemented endpoints (phase 4)

| Method | Endpoint | Who | Notes |
|---|---|---|---|
| GET | /api/v1/admin/stats | staff | `facility_id`, `region_code`, `days` (7, 30, 90). Facility staff must pass an assigned `facility_id` |
| GET | /api/v1/admin/facilities | staff | `q`, `verification_status`, `publication_status`, `region_code`; meta includes `status_counts` |
| POST | /api/v1/admin/facilities | admin, verifier | Creates an unpublished draft + "create" change request (201) |
| GET | /api/v1/admin/facilities/{id} | staff (assigned) | Includes `current` values, staff, recent change requests |
| PATCH | /api/v1/admin/facilities/{id} | staff (assigned) | Proposes a change (202). Fields: `name`, `type`, `address`, `city_code`, `barangay_code`, `latitude`, `longitude`, `contacts[]`, `hours[]`, `services[]`, `note` |
| POST | /api/v1/admin/facilities/{id}/reverify | admin, verifier | `method`: phone_call, site_visit, official_source, facility_confirmation |
| POST | /api/v1/admin/facilities/{id}/publication | admin, verifier | `status`: published or withdrawn, `reason` |
| GET | /api/v1/admin/change-requests | staff | `status` (default submitted); meta `queue` counts for reviewers |
| POST | /api/v1/admin/change-requests/{id}/approve · /reject · /withdraw | reviewer · reviewer · submitter | Reject requires `reason`; self-approval → 409 |
| GET, POST | /api/v1/admin/users | view: admin, verifier · invite: admin | Invite: `name`, `email`, `roles[]`, `facility_ids[]` |
| PATCH | /api/v1/admin/users/{id} | admin | `roles[]`, `status` (active, suspended), `facility_ids[]` |
| GET | /api/v1/admin/audit-logs | admin, verifier | `q`, `category`, `resource_type`, `resource_id`, `from`, `to` |
| POST | /api/v1/auth/forgot-password · /reset-password | public | Forgot always answers 202 (no account enumeration) |

## Implemented endpoints (phase 6)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/assistant` | Public | `{enabled}`, from the `features.assistant.enabled` setting |
| POST | `/api/v1/assistant/messages` | Public, `throttle:assistant` | Body `message` (3–500), optional `region_code` or `lat`/`lng`. Returns `outcome` (`answered`, `no_information`, `emergency`, `out_of_scope`), `answer`, `citations[]` (`key`, `type`, `id`, `title`, `url`, `verified_at`, `is_stale`) and `notice`. `503 service_unavailable` when switched off |
| GET | `/api/v1/admin/assistant/overview` | Admin, verifier | Provider in use, public switch, outcome counts (30 days), fallbacks, p95 latency, document counts |
| POST | `/api/v1/admin/assistant/preview` | Admin, verifier | Same pipeline as the public endpoint, works while switched off; adds `provider` and `used_fallback` |
| POST | `/api/v1/admin/assistant/guardrails` | Admin, verifier | Runs `assistant.guardrail_cases` through the safety screen and retrieval only (no model call) |
| GET, POST | `/api/v1/admin/knowledge-documents` | Admin, verifier | List (filter `status`, `q`) and create (draft) |
| GET, PATCH | `/api/v1/admin/knowledge-documents/{id}` | Admin, verifier | Show and edit |
| POST | `/api/v1/admin/knowledge-documents/{id}/publish` | Admin, verifier | `409` until `verified_at` is set |
| POST | `/api/v1/admin/knowledge-documents/{id}/archive` | Admin, verifier | Removes it from retrieval |

## Additions (after phase 6)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/login` | New optional `remember` (boolean): web sign-in sets a remember-me cookie for `REMEMBER_ME_DAYS` |
| GET | `/api/v1/admin/locations/map?level=&code=` | Admin roles. Area position, bbox and boundary (GeoJSON) from OpenStreetMap, cached in `area_geometries`; falls back to the parent area (`approximate: true`). Plus facilities with coordinates (staff: assigned only). 60/min |
| POST | `/api/v1/admin/locations/sync` | Admin, verifier. Queues a full PSGC download and import (`202`). Limited to 6 per hour |
| GET | `/api/v1/admin/facilities` | New `facility_id` filter; `region_code` and `facility_id` also narrow `meta.status_counts` |
| GET | `/api/v1/admin/change-requests` | New `region_code` filter |

## Implemented endpoints (phase 7)

**Public and patients**

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health-programs` | Current published programs (`category`, `region_code`) |
| GET | `/api/v1/health-programs/{id}` | Program with its published participating facilities |
| GET | `/api/v1/facilities/{id}/availability` | Open times with seats left (next 14 days, `days` ≤ 31). `meta.booking_enabled` |
| POST | `/api/v1/auth/register` | Patient account: `name`, `email`, `mobile` (PH), `password`, `password_confirmation`, `privacy_consent` |
| POST | `/api/v1/appointments` | Header `Idempotency-Key` (8–64 chars) required. Body `slot_id`. `201` new, `200` same key again, `409` full/closed/limit |
| GET | `/api/v1/me/appointments` | The patient's own appointments |
| GET | `/api/v1/appointments/{id}` | Own appointment with history |
| POST | `/api/v1/appointments/{id}/cancel` | Until `booking.cancel_cutoff_hours` before |
| GET | `/api/v1/me/notifications` | Latest 30 in-app notifications and `meta.unread` |
| POST | `/api/v1/me/notifications/{id}/read`, `/api/v1/me/notifications/read-all` | Mark read |
| POST | `/api/broadcasting/auth` | Reverb private-channel auth (`users.{publicId}`), cookie or token |

**Admin**

| Method | Path | Access | Notes |
|---|---|---|---|
| GET, POST | `/api/v1/admin/health-programs` | Admin, verifier | List (`status`, `q`, scope) with `meta.status_counts`; create (draft) |
| GET, PATCH | `/api/v1/admin/health-programs/{id}` | Admin, verifier | Show, edit (incl. `facility_ids`) |
| POST | `/api/v1/admin/health-programs/{id}/publish`, `/archive` | Admin, verifier | Publish needs a facility and a future end date |
| GET | `/api/v1/admin/appointments` | Facility staff (assigned), system admin | `view` = requests / upcoming / past, scope, `q`; includes patient name and mobile; `meta.counts` |
| POST | `/api/v1/admin/appointments/{id}/{confirm, decline, cancel, complete, no-show}` | Same | `reason` required for decline and cancel |
| GET, POST | `/api/v1/admin/facilities/{id}/availability` | Assigned staff, system admin | Next 14 days of times; generate times (date range × weekdays × time window × slot length × seats) |
| DELETE | `/api/v1/admin/availability/{slot}` | Same | Refused while it holds bookings |
| PATCH | `/api/v1/admin/facilities/{id}/booking` | System admin | Opt the facility into the pilot (audited) |
| PATCH | `/api/v1/admin/users/{id}` | System admin | Now also edits `name`, `email` and `mobile`. A new email signs the member out of other devices |

Docs section 9.6 listed staff actions under `/staff/appointments/...`; they are under `/admin/appointments/...` with the rest of the console.

## Additions (mobile app parity)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/me/push-tokens` | Signed in. `{token: "ExponentPushToken[…]", platform: ios\|android}` registers this phone for push. A device belongs to whoever signed in on it last |
| DELETE | `/api/v1/me/push-tokens` | `{token}`: sign-out on the phone |

In-app notifications (`InAppNotification`) are also sent to registered phones through Expo's push service. The payload has `title`, `body` and `data.path`. Tokens Expo reports as no longer registered are removed. Mobile live updates use the same Reverb channel as the web (`private-users.{publicId}`), authorised with the Bearer token at `/api/broadcasting/auth`.

## Additions (booking for everyone, catalog, patients, reports, roles)

### Booking
- **Guest booking (no account), public:**
  - `POST /appointments/guest` sends `{slot_id, name, email, mobile, privacy_consent}` and emails a 6-digit code (202 `{verification_id, sent_to}`).
  - `POST /appointments/guest/verify` sends `{verification_id, code}` and creates the request (201; a retry returns 200 with the same appointment).
- **Check or cancel by reference, public:** `POST /appointments/lookup` and `POST /appointments/lookup/cancel` take `{reference_code, email}`. Both must match, otherwise the answer is 404.
- **Staff booking:** `POST /admin/facilities/{facility}/appointments` with the header `Idempotency-Key` sends `{slot_id, name, mobile?, email?, patient?}`.
  - It is confirmed at once.
  - An email that belongs to a patient account links the appointment to that account.
- **What appointments now include:** `source` (online, guest or staff). Staff views also show `patient.account_id` and `booked_by`.
- **Reminders:** `communitycare:send-reminders` runs hourly and reminds people of confirmed appointments in the next 24 hours, once each.

### Your own account
- `PATCH /me`: change `name` and `mobile`.
- `PUT /me/password`: send `current_password`, `password` and `password_confirmation`. Other devices are signed out.
- `DELETE /me`: send `password`. Patients only. Upcoming appointments are cancelled, and past ones keep the name only.

### Admin
- **Catalog:** `GET|POST /admin/catalog/{services|facility-types}`, `PATCH|DELETE /admin/catalog/{catalog}/{slug}`, and `POST …/{slug}/archive|restore`.
  - The public lists hide archived items (add `?with_archived=1` to include them).
- **Patients:** `GET /admin/patients`, `GET /admin/patients/{id}` and `PATCH /admin/patients/{id}/status`.
- **Reports:**
  - `GET /admin/reports?from&to` returns the report data.
  - `GET /admin/reports/export?dataset=appointments|facilities|daily` returns a CSV file with no contact details.
- **Roles:** `GET|POST /admin/roles` and `PATCH|DELETE /admin/roles/{name}`.
