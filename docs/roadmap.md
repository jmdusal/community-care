# Implementation Roadmap

[← Documentation index](README.md)

> **Status (November 7, 2026):** Phase 1 (Foundation) is complete: Laravel 13 API on MySQL via Herd, Identity/Settings/Audit modules, after-commit domain events with a queued audit listener, the standard error format, token sign-in, the admin settings API, and the React + TypeScript + Tailwind admin shell. 
>
> **Phase 2 (Data pipeline) is complete:** PSGC and facility schema, configurable NHFR/CSV adapters, staging with matching and flags, record review, publish, the `communitycare:import` command, and the Imports and Locations screens. 
>
> **Phase 3 (Public directory) is complete:** facility search (full-text with LIKE fallback for short words, location/type/service filters, verified-only, nearby on the spatial index), facility detail with provenance and the verification notice, service and facility-type catalogs, anonymous usage events, browser sign-in, the public search and facility pages, and the admin Settings screen. 
>
> **Phase 4 (Admin workflow) is complete:** every create/edit is a change request approved by a different person (four-eyes) with a guard against stale proposals; facility staff are limited to assigned facilities; re-verify and withdraw/restore; invitations with set-password links, role/status/assignment changes; audit log API; data-driven dashboard stats with facility/region scope; nightly stale job; and the Overview, Facilities, Review queue, Team & roles and Audit log screens. 
>
> **Phase 5 (Mobile app) is complete:** Expo SDK 58 app (`apps/mobile`) with search (text, region, near me via device location), facility screen (tap to call, directions, hours, services, verification notice, source), saved facilities stored on the device and readable offline, retries for weak connections, a one-tap 911 button on every screen, and theme from the shared design tokens. Verified with TypeScript, Expo lint, Expo Doctor (20/20) and iOS + Android bundle exports.
>
> **Phase 6 (AI assistant) is complete:** `KnowledgeAssistant` module with a swappable `AiProvider` (grounded provider by default, needing no AI account; Claude via the official Anthropic PHP SDK when `ASSISTANT_PROVIDER=claude` and `ANTHROPIC_API_KEY` are set, falling back to grounded on failure or refusal); a safety screen for emergencies and medical-advice questions (English and Filipino) that runs before retrieval or any model call; retrieval of published facilities and `knowledge_documents`; answers that cite nothing are replaced with "no information"; citations with verified dates and stale flags; interaction metrics without storing question text; admin test console, knowledge documents (draft → publish → archive, audited) and guardrail checks; public `/assistant` page. 97 API tests and 6 web tests pass. 
>
> **Phase 7 (Booking pilot) is complete:**
> - **Health programs:** create, publish and archive with participating facilities. Shown on the public `/programs` pages and on each facility page.
> - **Booking pilot:**
>   - Off by default. It needs both `features.booking.enabled` and each facility opted in by a system admin.
>   - Staff publish appointment times with seat limits.
>   - Patients create an account (name, email, mobile, privacy consent) and request a time. Retries use an `Idempotency-Key`, and the slot row is locked so the last seat can't be taken twice.
>   - Staff confirm, decline (with a reason), complete or mark no-show. Patients cancel online until the cut-off.
>   - Every step is audited, and email plus in-app notifications go to the right people.
> - **Real-time notifications (Laravel Reverb):** a bell with an unread count, live toasts, and on-screen data that refreshes itself.
> - **Scope:** every scoped screen follows the top-bar facility or region picker, covered by `ScopeIsolationTest`.
> - **Tests:** 140 API tests and 8 web tests pass.
>
> Next: Phase 8 (Pilot readiness).
>
> **Phase 8 (Pilot readiness) is complete:**
> - **Security:**
>   - Two-factor sign-in by email code or authenticator app, with recovery codes and an admin reset. Required for system admins, facility admins and verifiers.
>   - Security headers on the API.
>   - `RouteProtectionTest` checks every admin route (sign-in required, and no data or validation hints for patients).
>   - `communitycare:preflight` checks a server before go-live.
> - **Roles:** a new **Facility admin** role (full control of assigned facilities only). System admins' facility edits go live at once; every other role keeps four-eyes review.
> - **Data quality:** report (command and admin screen) with 8 checks, following the top-bar scope.
> - **Recovery:**
>   - `communitycare:backup` (nightly, keeps 14) and `communitycare:restore-check` (weekly real restore test).
>   - The health check now reports a stuck queue.
> - **Accessibility and responsive design:** axe-core scan of every page at 1280 px and 390 px. The result is 0 violations and no horizontal scrolling.
> - **Pilot documents:** [pilot checklist](pilot-checklist.md), [operations runbook](operations.md), [staff guide](staff-guide.md).
> - **Tests:** 173 API tests and 8 web tests pass.
>
> **Mobile app update:** the app matches the public website:
> - **Search:** region, city and barangay, list or map (OpenStreetMap).
> - **Programs.**
> - **Ask:** the free grounded assistant.
> - **Patient accounts:** with two-factor support, plus booking and My appointments.
> - **Notifications:** live in-app (Reverb), and Expo push once an EAS development build exists.
>
> **Completion pass:**
> - **Booking for everyone:** guests (no account) book with an email code; staff book walk-ins and phone callers; day-before reminders.
> - **Patient accounts:** edit profile, change password, delete account.
> - **New admin pages:** Patients, Reports (with CSV export), Services & types.
> - **Editable roles and permissions** in Team & roles.
>
> All eight roadmap phases are built. Before go-live, work through the pilot checklist.

The schedule is an illustrative plan for a focused first release, not a delivery guarantee.

| Phase | Indicative timing | Deliverables |
|---|---|---|
| 1. Foundation | Weeks 1–2 | Monorepo, Laravel Herd + DBngin local setup, Laravel, React + Tailwind, MySQL 8, Redis, CI, module skeleton, settings, event bus, API conventions, initial tests. |
| 2. Data pipeline | Weeks 3–4 | Facility and PSGC schema, import adapters, staging, normalization, deduplication, source tracking, import events. |
| 3. Public directory | Weeks 5–6 | Search (full-text and nearby), filters, detail pages, responsive web UI. |
| 4. Admin workflow | Weeks 7–8 | Roles, facility assignment, change requests, four-eyes review, admin console, audit listeners, dashboard stats. |
| 5. Mobile app | Weeks 9–10 | Expo app, directory search, detail pages, directions and contact links. |
| 6. AI assistant | Weeks 11–12 | Retrieval, grounded answers, citations and source dates, safety evaluation. |
| 7. Booking pilot | Weeks 13–14 | Clinic-approved availability, requests, confirmations, notifications. |
| 8. Pilot readiness | Weeks 15–16 | Security review, accessibility, data-quality review, recovery tests, limited pilot. |

## Suggested build order

1. Create the monorepo and the Laravel API skeleton with module folders, settings, and event wiring.
2. Implement facility and geography migrations (MySQL) with factories and seeders.
3. Build import staging and source provenance before importing a large dataset.
4. Implement public facility endpoints and API tests.
5. Build the web directory and the admin verification console with Tailwind.
6. Add mobile screens against the same API.
7. Add AI only after reliable source data is available.
8. Add appointment workflows only with a participating facility and a confirmed operational process.
