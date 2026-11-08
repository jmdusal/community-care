# Changelog

[← Documentation index](README.md)

Version 1.1 rearranges the document into build order and records the decisions below. Sections marked **(new)** did not exist in version 1.0.

| Area | Version 1.0 | Version 1.1 |
|---|---|---|
| Database | PostgreSQL + PostGIS | **MySQL 8.0+** with native spatial types (`POINT`, SRID 4326) and InnoDB `FULLTEXT` indexes ([Section 8.8](database.md)) |
| Web styling | Not specified | **Tailwind CSS** with shared design tokens ([Section 13](frontend.md)) |
| Backend structure | Modular monolith only | Modular monolith built on **SOLID**, **data-driven** and **event-driven** principles **(new, [Section 6](backend-principles.md))** |
| Staff ↔ facility assignment | Rule stated, no table | `facility_user` table **(new)** |
| Corrections and four-eyes review | Described, no table | `facility_change_requests` table and lifecycle **(new)** |
| Verification fields | Split between Sections 5 and 9 | Unified on `facilities`: `publication_status`, `verified_by`, `verification_method`, `review_notes` |
| Import staging | "Staging tables" mentioned | `import_staging_records` and `duplicate_candidates` defined **(new)** |
| Settings and usage metrics | Missing | `settings` and `usage_events` tables **(new)** |
| Holiday / temporary closures | Mentioned | `facility_hour_exceptions` table **(new)** |
| Admin API | 7 endpoints | Full admin surface: stats, review queue, change requests, audit logs, users, settings, programs **(new)** |
| API responses | "Consistent JSON" | Example success, paginated and error responses **(new)** |
| Authentication | Sanctum referenced | Decided: cookie session for web, token for mobile |
| Facility scope | Not covered | Admin dashboard can be scoped to one facility; enforced by the API **(new)** |
| Local environment | Not specified | **Laravel Herd + DBngin** (MySQL, Redis) with no Docker; see docs/local-development.md **(new)** |
| File structure | One-line folder summary | Full file trees for backend, web, mobile and shared packages, plus naming conventions **(new, [Section 7](file-structure.md))** |
| Emergency guidance | "Local emergency services" | Names the national emergency hotline, **911** |
