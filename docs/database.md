# Database Schema (MySQL)

[← Documentation index](README.md)

## 8.1 Conventions

- **MySQL 8.0 or later**, InnoDB engine, `utf8mb4` character set with `utf8mb4_0900_ai_ci` collation (supports Filipino names and accents).
- Internal primary keys are `BIGINT UNSIGNED`; public identifiers are ULIDs (`CHAR(26)`) so IDs in URLs cannot be guessed.
- Every table has `created_at` and `updated_at`; foreign keys and indexes exist for every common filter.
- Status columns are `VARCHAR` backed by PHP enums (not MySQL `ENUM`), so adding a state needs no table rebuild.
- Timestamps are stored in UTC and returned in ISO 8601 with the `+08:00` offset (Asia/Manila).

## 8.2 Identity and geography

| Table | Fields / purpose |
|---|---|
| users | id, public_id, name, email (unique), password, status, mfa_enabled, email_verified_at, last_active_at, timestamps |
| roles | id, name (unique), description |
| role_user | user_id, role_id; unique pair |
| **facility_user** (new) | user_id, facility_id, assigned_by, assigned_at; unique pair. Defines which facilities a staff member may edit. |
| regions | id, psgc_code (unique), name, psgc_release |
| provinces | id, region_id, psgc_code (unique), name, is_district (NCR districts), psgc_release |
| cities_municipalities | id, province_id, psgc_code (unique), name, kind (city/municipality), psgc_release |
| barangays | id, city_municipality_id, psgc_code (unique), name, psgc_release |

## 8.3 Facility directory

| Table | Fields / purpose |
|---|---|
| facility_types | id, slug, name, description |
| facilities | id, public_id, name, facility_type_id, address, region_id, province_id, city_municipality_id, barangay_id, latitude, longitude, verification_status, **publication_status**, verified_at, **verified_by**, **verification_method**, **review_notes**, timestamps; FULLTEXT(name, address) |
| **facility_locations** (new) | facility_id (primary), `location POINT NOT NULL SRID 4326` with a SPATIAL INDEX. A separate table keeps the column NOT NULL (required by the spatial index) while facilities without coordinates have no row. |
| services | id, slug, name, category, description |
| facility_services | id, facility_id, service_id, availability_status, source_id, verified_at |
| facility_contacts | id, facility_id, contact_type, value, is_public |
| facility_hours | id, facility_id, day_of_week, opens_at, closes_at, notes |
| **facility_hour_exceptions** (new) | id, facility_id, date, is_closed, opens_at, closes_at, reason (holidays, temporary closures) |
| facility_sources | id, facility_id, source_name, source_url, source_record_id, payload_hash, checked_at, imported_at; unique(source_name, source_record_id) |

## 8.4 Review and imports

| Table | Fields / purpose |
|---|---|
| **facility_change_requests** (new) | id, facility_id, submitted_by, origin (staff / verifier / import), changes (JSON: field → before/after), status (submitted / approved / rejected / withdrawn), reviewed_by, reviewed_at, reason, timestamps |
| import_batches | id, source_name, source_version, file_path, usage_terms, started_by, started_at, finished_at, status, current_step, records_processed, error_summary |
| **import_staging_records** (new) | id, import_batch_id, source_record_id, payload (JSON, normalized), match_status (new / updated / unchanged), matched_facility_id, flags (JSON), decision (pending / approved / rejected) |
| **duplicate_candidates** (new) | id, import_batch_id, staging_record_id, facility_id, reason (name+address / coordinates), score, resolution, resolved_by, resolved_at |

## 8.5 Operations and settings

| Table | Fields / purpose |
|---|---|
| **settings** (new) | key (primary), value (JSON), updated_by, timestamps. Type, default and validation rules live in `SettingsSchema` (code); a missing row means the default. |
| audit_logs | id, event_key (unique, for idempotency), actor_id, action, resource_type, resource_id, before (JSON, redacted), after (JSON, redacted), ip_masked, request_id, created_at |
| **usage_events** (new) | id, event (search / profile_view / call_click / directions_click), facility_id (nullable), region_id, query_hash, session_hash, created_at. Anonymous: no user ID, no raw IP. |
| notifications | id, user_id, type, status, sent_at, read_at |
| jobs, failed_jobs | Laravel queue tables for queued listeners |

## 8.6 Later phases

| Table | Fields / purpose |
|---|---|
| clinic_availability | id, facility_id, service_id, starts_at, ends_at, capacity |
| appointments | id, patient_id, facility_id, service_id, starts_at, status, reference_code |
| appointment_events | id, appointment_id, actor_id, old_status, new_status, created_at |
| health_programs | id, title, category, description, starts_at, ends_at, published_at |
| program_facilities | program_id, facility_id |
| knowledge_documents | id, title, source_url, version, verified_at, published_at |

## 8.7 Relationship summary

- One facility has many contacts, hours, hour exceptions, sources, change requests, and facility-service associations.
- Facilities and services are many-to-many through `facility_services`.
- Users and facilities are many-to-many through `facility_user` (staff assignment).
- One import batch has many staging records and duplicate candidates.
- Health programs and facilities are many-to-many through `program_facilities`.
- Appointment events and audit logs preserve history; neither stores medical data.

## 8.8 MySQL-specific notes (replacing PostGIS)

| Need | MySQL 8 approach |
|---|---|
| Store coordinates | `location POINT NOT NULL SRID 4326` with a `SPATIAL INDEX`. Keep `latitude` / `longitude` `DECIMAL(9,6)` copies for simple reads and exports. |
| Nearby search | Pre-filter with a bounding box (`MBRContains` on the spatial index), then sort by `ST_Distance_Sphere`. Cap `radius_km` (default 50). |
| Axis order | MySQL treats SRID 4326 as latitude-longitude. Be explicit, for example `ST_GeomFromText('POINT(lng lat)', 4326, 'axis-order=long-lat')`, and cover it with a test. |
| Text search | InnoDB `FULLTEXT` index on `facilities(name, address)`, using `MATCH ... AGAINST` in boolean mode. Move to a search engine only if results prove inadequate. |
| Flexible fields | `JSON` columns for change sets, staging payloads, and audit before/after values. |
| Migrations | Laravel migrations only; no manual schema changes. Test migrations against the same MySQL version in CI. |

```sql
-- Facilities within 10 km of a point, nearest first
SELECT id, name,
       ST_Distance_Sphere(location, @here) / 1000 AS distance_km
FROM facilities
WHERE publication_status = 'published'
  AND MBRContains(@box, location)              -- uses the spatial index
  AND ST_Distance_Sphere(location, @here) <= 10000
ORDER BY distance_km
LIMIT 20;
```

## 8.9 Data modeling notes

- Preserve external source identifiers to support reliable re-imports and deduplication.
- Track the source and last verification date for every important public claim.
- Keep **verification status** (our review) separate from **publication status** (visible to the public) and from any externally sourced accreditation claim.
- Model service availability separately from whether a facility generally offers that service.
- For bookings, enforce capacity with transactions and row locking (`SELECT ... FOR UPDATE`) or uniqueness rules.
- Avoid medical history, diagnoses, prescriptions, and clinical notes in the initial directory MVP.
