<div class="cover">

# CommunityCare AI

<p class="subtitle">Technical Documentation &amp; System Design</p>
<div class="rule"></div>
<p class="tagline">A public healthcare directory for the Philippines, with web and mobile applications.</p>

| | |
|---|---|
| **Backend** | Laravel REST API (SOLID, data-driven, event-driven) |
| **Web** | React + TypeScript + Tailwind CSS |
| **Mobile** | React Native + Expo |
| **Database** | MySQL 8.0+ (InnoDB, spatial + full-text indexes) |
| **Document version** | 1.1 (revised design blueprint, November 7, 2026) |

<p class="purpose">Purpose: a practical implementation blueprint for a solo developer or small team. This document is a design proposal, not a claim of government endorsement or legal compliance.</p>

</div>

<div class="page-break"></div>

## Contents

1. What Changed in Version 1.1
2. Executive Summary
3. Product Scope and MVP
4. Technology Stack
5. System Architecture
6. Backend Engineering Principles: SOLID, Data-Driven, Event-Driven
7. Repository and File Structure
8. Database Schema (MySQL 8)
9. API Design
10. Roles and Permissions
11. Data Import and Verification
12. AI Assistant Design
13. Web Frontend and Admin Console (Tailwind CSS)
14. Security, Privacy, and Compliance
15. Testing and Deployment
16. Implementation Roadmap
17. MVP Acceptance Checklist and Definition of Done
18. References, Assumptions, and Open Decisions

<div class="callout">Recommended first release: a reliable public directory with search, facility details, geographic filters, source attribution, and an administrative verification workflow. Add appointments and AI after the directory is dependable.</div>

<div class="page-break"></div>

## 1. What Changed in Version 1.1

Version 1.1 rearranges the document into build order and records the decisions below. Sections marked **(new)** did not exist in version 1.0.

| Area | Version 1.0 | Version 1.1 |
|---|---|---|
| Database | PostgreSQL + PostGIS | **MySQL 8.0+** with native spatial types (`POINT`, SRID 4326) and InnoDB `FULLTEXT` indexes (Section 8.8) |
| Web styling | Not specified | **Tailwind CSS** with shared design tokens (Section 13) |
| Backend structure | Modular monolith only | Modular monolith built on **SOLID**, **data-driven** and **event-driven** principles **(new, Section 6)** |
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
| File structure | One-line folder summary | Full file trees for backend, web, mobile and shared packages, plus naming conventions **(new, Section 7)** |
| Emergency guidance | "Local emergency services" | Names the national emergency hotline, **911** |

<div class="page-break"></div>

## 2. Executive Summary

CommunityCare AI is a public healthcare discovery platform that helps people in the Philippines find healthcare facilities, understand which services are listed, access verified public information, and eventually request appointments. It consists of a React web portal, a React Native mobile app, and a shared Laravel API backed by MySQL.

The first release focuses on information access rather than becoming a full electronic medical record (EMR) or clinical decision-support system. This reduces scope and minimizes collection of sensitive patient information.

### Product goals

- Make public healthcare facilities easier to discover by location, facility type, and service.
- Show contact information, operating hours, source provenance, and the last verification date.
- Give authorized administrators a controlled workflow to review and publish corrections.
- Provide an AI assistant that answers questions from approved public information and clearly acknowledges gaps.
- Create a foundation for optional appointment coordination and public health program announcements.

### Non-goals for the initial MVP

- Diagnosing conditions, recommending treatment, or replacing medical professionals.
- Storing comprehensive medical histories, prescriptions, laboratory results, or clinical notes.
- Guaranteeing real-time clinic capacity or appointment availability without a confirmed integration.
- Claiming that a facility is currently licensed, accredited, or eligible for a benefit unless the relevant authoritative source supports that claim.

## 3. Product Scope and MVP

### Primary users

| User type | Primary needs |
|---|---|
| Public visitor | Search facilities, view services and contacts, check source dates, open directions. |
| Registered user / patient | Save preferences and, in a later phase, request and track appointments. |
| Facility staff | Maintain authorized facility information and handle appointment requests for assigned facilities. |
| Data verifier | Review facility records, source evidence, imports, and proposed corrections. |
| System administrator | Manage roles, platform configuration, imports, security controls, and audit review. |

### MVP features

1. Facility directory with search, pagination, facility types, service filters, and geographic filters.
2. Facility detail pages with address, public contacts, listed services, opening hours, data source, and last-verified date.
3. Admin console for importing, reviewing, correcting, approving, and publishing records.
4. Location hierarchy for region, province, city/municipality, and barangay using PSGC codes.
5. Responsive, accessible web UI (Tailwind CSS) and a mobile app that consumes the same API.
6. Operational basics: logs, backups, monitoring, automated tests, and documented data refresh procedures.

### Phase 2 features

- Appointment request and confirmation workflows with clinic-approved schedules.
- Health program announcements and facility participation.
- Push, email, or SMS notifications where consent, provider contracts, and cost are addressed.
- AI information assistant grounded in approved source records.

### Success measures

Each measure is computed from data the platform stores, so it can be shown on the admin dashboard.

| Measure | Computed from |
|---|---|
| Search success rate (searches that open a facility profile) | `usage_events` |
| Share of published records with a traceable source and recent verification | `facilities`, `facility_sources` |
| Duplicate or conflicting records detected and resolved | `duplicate_candidates`, `facility_change_requests` |
| Mobile performance, accessibility results, API error rates | Monitoring and CI reports |
| If booking launches: request completion and clinic-confirmed rate | `appointments`, `appointment_events` |

<div class="page-break"></div>

## 4. Technology Stack

| Layer | Technology | Responsibilities |
|---|---|---|
| Web | React + TypeScript + **Tailwind CSS** (Vite build) | Public directory, maps, admin console, accessibility, responsive layouts. |
| Mobile | React Native + Expo (NativeWind optional, to reuse Tailwind tokens) | Android/iOS directory, location-aware search, saved facilities, links and notifications. |
| API | Laravel REST API | Validation, authentication, authorization, business rules, API resources, domain events. |
| Database | **MySQL 8.0+** (InnoDB, utf8mb4) | Relational data, spatial queries (`POINT`, SRID 4326), `FULLTEXT` search, constraints. |
| Cache / queues | Redis | Cache popular queries and dashboard stats; run queued listeners, imports, and notifications. |
| AI | LLM API behind a provider adapter | Generate grounded answers from approved public records and documents. |
| Files | S3-compatible object storage | Store permitted source files, approved public documents, and exports. |
| Operations | Laravel Herd + DBngin locally (no Docker), GitHub Actions CI, HTTPS hosting | Repeatable environments, deployment, secrets, backups, monitoring. |

## 5. System Architecture

Use a **modular monolith** for the first release: one Laravel application, one MySQL database, and clear domain boundaries. Modules talk to each other through interfaces and domain events, so a module can be extracted into a service later if there is a proven need.

```
  Web (React + Tailwind)        Mobile (React Native + Expo)
            \                         /
             \      HTTPS /api/v1    /
              v                     v
        +-------------------------------------+
        |           Laravel API               |
        |  Routes -> Middleware -> Controller |
        |  FormRequest -> Policy -> Action    |
        |  Action -> Repository -> MySQL      |
        |  Action -> Domain Event (after      |
        |            commit) ----------+      |
        +------------------------------|------+
              |            |           v
          MySQL 8       Redis      Queued listeners
       (data, spatial, (cache,     (audit log, notifications,
        full-text)      queues)     cache refresh, AI re-index)
                                        |
                              S3 storage / AI provider
```

### Request flow

1. A web or mobile client calls a versioned endpoint under `/api/v1`.
2. Laravel middleware applies rate limits and authenticates the caller where required.
3. A Form Request validates input; a Policy decides whether the caller may act.
4. A single-purpose **Action** class runs the business rule inside a database transaction, using repository interfaces.
5. The Action raises a **domain event**, dispatched only after the transaction commits.
6. The response is shaped by an API Resource using the shared JSON contract.
7. Queued listeners handle side effects (audit log, notifications, cache, AI index) outside the request.

### Deployment recommendation

- Separate development, staging, and production environments.
- Use HTTPS everywhere; keep MySQL and Redis ports on a private network only.
- Use managed MySQL where practical; configure automated backups and test restoration.
- Keep AI keys and other credentials on the server, never in web or mobile bundles.
- Use one API origin for both clients where possible and document CORS and session configuration.

<div class="callout">Do not start with microservices. A single well-structured Laravel deployment is enough for an initial public directory.</div>

<div class="page-break"></div>

## 6. Backend Engineering Principles: SOLID, Data-Driven, Event-Driven

The backend applies three principles together. **SOLID** keeps each class small and replaceable. **Data-driven** design keeps rules and reference values in data instead of code. **Event-driven** design separates the main business change from its side effects.

### 6.1 SOLID principles

| Principle | Rule in this codebase | Applied in Laravel |
|---|---|---|
| **S**ingle responsibility | One class, one reason to change. | Thin controllers; one Action per use case (`ApproveFacilityAction`); Form Requests validate; API Resources shape output; Policies authorize. |
| **O**pen/closed | Add behaviour by adding classes, not editing working ones. | New data sources implement `ImportSourceAdapter` (NHFR, PSGC, CSV); new AI providers implement `AiProvider`; verification checks are pluggable rule classes. |
| **L**iskov substitution | Every implementation honours its interface's contract. | Each adapter returns the same normalized `FacilityRecordData` and throws the same exceptions; one shared contract test suite runs against every implementation. |
| **I**nterface segregation | Small, focused interfaces. | `FacilityReader` and `FacilityWriter` instead of one large repository; `Geocoder` separate from imports. |
| **D**ependency inversion | Depend on interfaces, not concrete classes. | Actions receive interfaces through constructor injection; bindings live in each module's Service Provider. |

**Example: an Action with injected dependencies**

```php
namespace App\Domain\Facilities\Actions;

final class ApproveFacilityAction
{
    public function __construct(
        private FacilityWriter $facilities,
        private ChangeRequestRepository $changeRequests,
    ) {}

    public function handle(ChangeRequest $request, User $reviewer): Facility
    {
        // Four-eyes rule: the submitter cannot approve their own change.
        if ($request->submitted_by === $reviewer->id) {
            throw new SelfApprovalNotAllowed();
        }

        return DB::transaction(function () use ($request, $reviewer) {
            $facility = $this->facilities->applyChanges($request);
            $facility = $this->facilities->markVerified($facility, $reviewer);
            $this->changeRequests->markApproved($request, $reviewer);

            FacilityApproved::dispatch($facility->id, $reviewer->id, $request->id);

            return $facility;
        });
    }
}
```

**Example: an open/closed import adapter contract**

```php
namespace App\Domain\DataImports\Contracts;

interface ImportSourceAdapter
{
    /** Unique key stored on import_batches.source_name, e.g. "doh_nhfr". */
    public function key(): string;

    /** @return iterable<FacilityRecordData> normalized records for staging */
    public function read(ImportFile $file): iterable;
}

// app/Domain/DataImports/DataImportsServiceProvider.php
$this->app->tag([NhfrAdapter::class, PsgcAdapter::class, CsvAdapter::class], 'import.adapters');
```

**Rules of thumb**

- Controllers only coordinate: validate, authorize, call one Action, return a Resource.
- No business logic in Eloquent models beyond relationships, casts, and scopes.
- Domain classes receive dependencies through constructors, not facades, so they are easy to test.
- Prefer small final classes and typed DTOs over large services and loose arrays.

### 6.2 Data-driven design

Behaviour that administrators may need to change is stored as **data**, not hard-coded. Changing it is an audited database update, not a deployment.

| What is data-driven | Stored in | Example |
|---|---|---|
| Facility types and service catalog | `facility_types`, `services` | Adding "Animal bite center" needs no code change. |
| Geographic hierarchy | PSGC tables + `psgc_release` | A new PSGC release is imported, not coded. |
| Verification thresholds | `settings` | `verification.stale_after_days = 180`; `imports.coordinate_conflict_km = 1.0`. |
| Rate limits and page sizes | `settings` (cached) | `api.rate_limit.search = 60` per minute per IP. |
| Import field mappings | `settings` or mapping config per adapter | A CSV source maps its columns to `FacilityRecordData`. |
| Feature switches | `settings` | `features.assistant.enabled = false` until phase 6. |
| Dashboard metrics | `usage_events` + aggregate queries | Admin stats are computed, never typed in. |

**Rules**

- Typed **Data Transfer Objects** (DTOs) carry data between layers (for example `FacilityRecordData`, `FacilitySearchData`); arrays are not passed around.
- Settings are read through one `SettingsRepository`, cached (Redis in production), and invalidated by the `SettingUpdated` event.
- Every setting has a type, default, and validation rule; changes are written to `audit_logs`.
- Only make something configurable when an administrator really needs to change it at runtime. Everything else stays in code with tests.

```php
// Stale rule driven by a setting, run nightly by the scheduler
$days = $settings->int('verification.stale_after_days', default: 180);

Facility::query()
    ->where('verification_status', VerificationStatus::Verified)
    ->where('verified_at', '<', now()->subDays($days))
    ->chunkById(500, fn ($batch) => $markStale->handle($batch));
```

### 6.3 Event-driven design

Every meaningful state change raises a **domain event**. The Action that changes the data stays short; listeners handle the side effects.

**Approve-facility flow**

```
Verifier clicks Approve
  -> POST /api/v1/admin/change-requests/{id}/approve
  -> ApproveFacilityAction (DB transaction: apply change, mark verified)
  -> commit
  -> FacilityApproved event
       |-> WriteAuditLog            (queued)
       |-> NotifySubmitter          (queued)
       |-> RefreshDirectoryCache    (queued)
       |-> RefreshDashboardStats    (queued)
       '-> ReindexAssistantKnowledge (queued, phase 6)
```

**Event catalogue**

| Event | Raised when | Main listeners |
|---|---|---|
| `FacilityChangeSubmitted` | Staff or a verifier proposes a change | Audit log, notify verifiers, update review-queue count |
| `FacilityApproved` | A change request is approved and published | Audit log, notify submitter, refresh caches, re-index assistant |
| `FacilityRejected` | A change request is rejected with a reason | Audit log, notify submitter |
| `FacilityMarkedStale` | Nightly job finds verification older than the threshold | Audit log, add to review queue, weekly digest |
| `ImportBatchStarted` | An authorized user or the scheduler starts an import | Audit log |
| `ImportBatchStaged` | Records are normalized and matched in staging | Run duplicate and conflict detection |
| `ImportRecordFlagged` | A duplicate or conflict is detected | Add to review queue |
| `ImportBatchPublished` | Approved staged records are published | Audit log, refresh caches, notify importer |
| `ImportBatchFailed` | A batch fails at any step | Audit log, alert admins (published data unchanged) |
| `UserInvited` / `UserRoleChanged` | Access changes | Audit log, security alert email |
| `SettingUpdated` | A setting changes | Audit log, clear settings cache |
| `KnowledgeDocumentPublished` | A document is approved for the assistant | Re-index assistant knowledge |
| `HealthProgramPublished` | A program becomes visible | Refresh caches, notify subscribed users (phase 2) |
| `AppointmentRequested` / `AppointmentConfirmed` | Booking changes (phase 2) | Notifications, appointment history |

**Rules**

- Event names are in the past tense and describe a business fact.
- Events carry IDs and minimal fields only. **No personal contact details or medical data in event payloads.**
- Events are dispatched **after the database commit** (`ShouldDispatchAfterCommit`), so listeners never see uncommitted data.
- Listeners are queued (`ShouldQueue`) on Redis, with retries and backoff, and must be **idempotent** (safe to run twice).
- Work that must succeed or fail together stays inside the Action's transaction. Events are for side effects only.
- If events later need to reach external systems reliably, add an outbox table rather than calling them inside the request.

```php
final class FacilityApproved implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(
        public readonly int $facilityId,
        public readonly int $reviewerId,
        public readonly int $changeRequestId,
    ) {}
}

final class WriteAuditLog implements ShouldQueue
{
    public int $tries = 5;

    public function handle(FacilityApproved $event): void
    {
        AuditLog::firstOrCreate(
            ['event_key' => "facility.approved:{$event->changeRequestId}"], // idempotent
            [
                'actor_id' => $event->reviewerId,
                'action' => 'facility.approved',
                'resource_type' => 'facility',
                'resource_id' => $event->facilityId,
            ],
        );
    }
}
```

<div class="page-break"></div>

## 7. Repository and File Structure

A monorepo keeps the web app, mobile app, API, and documentation together. Share API contracts and design tokens; keep platform-specific UI separate. The trees below are the target structure; files are added as each phase is built.

### 7.1 Monorepo

```
communitycare-ai/
├── apps/
│   ├── api/                  # Laravel REST API (Section 7.3)
│   ├── web/                  # React + TypeScript + Tailwind CSS (Section 7.5)
│   └── mobile/               # React Native + Expo (Section 7.6)
├── packages/
│   ├── api-client/           # typed client generated from docs/api-spec.yaml
│   └── design-tokens/        # colors, spacing, typography -> Tailwind config
├── infrastructure/
│   └── deployment/           # host-specific config; local dev uses Herd + DBngin, no Docker
│       ├── staging.env.example
│       └── production.env.example
├── docs/
│   ├── architecture.md
│   ├── api-spec.yaml         # OpenAPI 3 contract
│   ├── events.md             # domain event catalogue (Section 6.3)
│   └── privacy-and-security.md
├── .github/workflows/
│   ├── api.yml               # PHP tests on MySQL 8 + Redis
│   ├── web.yml               # type-check, lint, tests, build
│   └── mobile.yml
└── README.md
```

### 7.2 Laravel domain modules

| Module | Responsibilities |
|---|---|
| Identity | Registration, login, profiles, role assignment, facility assignment, account status. |
| Facilities | Facility records, types, public contacts, opening hours, change requests, verification. |
| Services | Service catalog and facility-to-service relationships. |
| Geography | Regions, provinces, cities/municipalities, barangays, PSGC releases, coordinate search. |
| DataImports | Source adapters, staging, normalization, deduplication, import batch history. |
| Settings | Typed, cached, audited platform settings (data-driven configuration). |
| Analytics | Anonymous usage events and dashboard statistics. |
| Audit | Administrative actions, protected-resource access events, security review. |
| Notifications | Email/push/SMS delivery status, retries, user preferences. |
| HealthPrograms | Public announcements, campaign dates, participating facilities. |
| KnowledgeAssistant | Approved sources, retrieval, prompts, provider adapter, answer citations. |
| Appointments | Availability, requests, confirmations, cancellations, event history (later phase). |

### 7.3 Backend file structure (apps/api)

Every module follows the same folder pattern, so SOLID roles are visible from the path: **Actions** (single responsibility), **Contracts** (dependency inversion), **Data** (typed DTOs), **Events / Listeners** (event-driven), **Rules** and **Adapters** (open/closed).

```
apps/api/
├── app/
│   ├── Domain/
│   │   ├── Shared/              # DomainEvent base class, AuditableEvent contract, AuditEntryData
│   │   ├── Facilities/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateFacilityAction.php
│   │   │   │   ├── SubmitChangeRequestAction.php
│   │   │   │   ├── ApproveFacilityAction.php
│   │   │   │   ├── RejectChangeRequestAction.php
│   │   │   │   └── MarkFacilitiesStaleAction.php
│   │   │   ├── Contracts/
│   │   │   │   ├── FacilityReader.php
│   │   │   │   ├── FacilityWriter.php
│   │   │   │   └── ChangeRequestRepository.php
│   │   │   ├── Data/
│   │   │   │   ├── FacilityData.php
│   │   │   │   ├── FacilitySearchData.php
│   │   │   │   └── ChangeSetData.php
│   │   │   ├── Enums/
│   │   │   │   ├── VerificationStatus.php
│   │   │   │   ├── PublicationStatus.php
│   │   │   │   └── ChangeRequestStatus.php
│   │   │   ├── Events/
│   │   │   │   ├── FacilityChangeSubmitted.php
│   │   │   │   ├── FacilityApproved.php
│   │   │   │   ├── FacilityRejected.php
│   │   │   │   └── FacilityMarkedStale.php
│   │   │   ├── Exceptions/
│   │   │   │   └── SelfApprovalNotAllowed.php
│   │   │   ├── Listeners/
│   │   │   │   ├── NotifyVerifiers.php
│   │   │   │   ├── NotifySubmitter.php
│   │   │   │   └── RefreshDirectoryCache.php
│   │   │   ├── Models/
│   │   │   │   ├── Facility.php
│   │   │   │   ├── FacilityContact.php
│   │   │   │   ├── FacilityHour.php
│   │   │   │   ├── FacilityHourException.php
│   │   │   │   ├── FacilitySource.php
│   │   │   │   └── FacilityChangeRequest.php
│   │   │   ├── Policies/
│   │   │   │   ├── FacilityPolicy.php
│   │   │   │   └── ChangeRequestPolicy.php
│   │   │   ├── Repositories/
│   │   │   │   ├── EloquentFacilityRepository.php
│   │   │   │   └── EloquentChangeRequestRepository.php
│   │   │   ├── Rules/
│   │   │   │   ├── VerificationRule.php          # interface
│   │   │   │   ├── HasTraceableSource.php
│   │   │   │   └── HasValidCoordinates.php
│   │   │   └── FacilitiesServiceProvider.php     # bindings + event map
│   │   ├── DataImports/
│   │   │   ├── Actions/
│   │   │   │   ├── StartImportBatchAction.php
│   │   │   │   ├── StageRecordsAction.php
│   │   │   │   └── PublishImportBatchAction.php
│   │   │   ├── Adapters/
│   │   │   │   ├── NhfrAdapter.php
│   │   │   │   ├── PsgcAdapter.php
│   │   │   │   └── CsvAdapter.php
│   │   │   ├── Contracts/
│   │   │   │   └── ImportSourceAdapter.php
│   │   │   ├── Data/
│   │   │   │   └── FacilityRecordData.php
│   │   │   ├── Events/
│   │   │   │   ├── ImportBatchStarted.php
│   │   │   │   ├── ImportBatchStaged.php
│   │   │   │   ├── ImportRecordFlagged.php
│   │   │   │   ├── ImportBatchPublished.php
│   │   │   │   └── ImportBatchFailed.php
│   │   │   ├── Jobs/
│   │   │   │   └── RunImportBatch.php
│   │   │   ├── Matching/
│   │   │   │   ├── SourceIdMatcher.php
│   │   │   │   ├── DuplicateDetector.php
│   │   │   │   └── CoordinateConflictCheck.php
│   │   │   ├── Models/
│   │   │   │   ├── ImportBatch.php
│   │   │   │   ├── ImportStagingRecord.php
│   │   │   │   └── DuplicateCandidate.php
│   │   │   └── DataImportsServiceProvider.php
│   │   ├── Geography/
│   │   │   ├── Actions/FindNearbyFacilitiesAction.php
│   │   │   ├── Models/  Region.php  Province.php  CityMunicipality.php  Barangay.php
│   │   │   └── GeographyServiceProvider.php
│   │   ├── Identity/
│   │   │   ├── Actions/  InviteUserAction.php  ChangeUserRolesAction.php  AssignFacilityAction.php
│   │   │   ├── Events/   UserInvited.php  UserRoleChanged.php
│   │   │   ├── Models/   User.php  Role.php
│   │   │   └── IdentityServiceProvider.php
│   │   ├── Settings/
│   │   │   ├── Contracts/SettingsRepository.php
│   │   │   ├── Repositories/CachedSettingsRepository.php
│   │   │   ├── Events/SettingUpdated.php
│   │   │   ├── SettingsSchema.php                # keys, types, defaults, rules
│   │   │   └── SettingsServiceProvider.php
│   │   ├── Analytics/
│   │   │   ├── Actions/RecordUsageEventAction.php
│   │   │   ├── Queries/DashboardStatsQuery.php
│   │   │   └── Models/UsageEvent.php
│   │   ├── Audit/
│   │   │   ├── Listeners/WriteAuditLog.php
│   │   │   ├── Support/Redactor.php              # strips secrets and contact details
│   │   │   └── Models/AuditLog.php
│   │   ├── Services/            # service catalog (same pattern)
│   │   ├── Notifications/       # channels, preferences, delivery status
│   │   ├── HealthPrograms/      # programs + participating facilities
│   │   ├── KnowledgeAssistant/
│   │   │   ├── Contracts/AiProvider.php
│   │   │   ├── Providers/        # one adapter class per AI vendor
│   │   │   ├── Retrieval/KnowledgeRetriever.php
│   │   │   └── KnowledgeAssistantService.php
│   │   └── Appointments/        # phase 7 (same pattern)
│   ├── Http/
│   │   ├── Controllers/Api/V1/
│   │   │   ├── Public/
│   │   │   │   ├── FacilityController.php
│   │   │   │   ├── ServiceController.php
│   │   │   │   ├── LocationController.php
│   │   │   │   ├── HealthProgramController.php
│   │   │   │   └── AssistantController.php
│   │   │   ├── Auth/
│   │   │   │   ├── LoginController.php
│   │   │   │   ├── RegisterController.php
│   │   │   │   └── MeController.php
│   │   │   └── Admin/
│   │   │       ├── StatsController.php
│   │   │       ├── FacilityController.php
│   │   │       ├── ReviewQueueController.php
│   │   │       ├── ChangeRequestController.php
│   │   │       ├── ImportBatchController.php
│   │   │       ├── AuditLogController.php
│   │   │       ├── UserController.php
│   │   │       ├── SettingController.php
│   │   │       └── HealthProgramController.php
│   │   ├── Requests/
│   │   │   ├── Public/SearchFacilitiesRequest.php
│   │   │   └── Admin/
│   │   │       ├── UpdateFacilityRequest.php
│   │   │       ├── RejectChangeRequestRequest.php
│   │   │       ├── StartImportRequest.php
│   │   │       └── UpdateSettingsRequest.php
│   │   ├── Resources/
│   │   │   ├── FacilityResource.php              # public fields only
│   │   │   ├── AdminFacilityResource.php         # adds provenance + review fields
│   │   │   ├── ChangeRequestResource.php
│   │   │   ├── ImportBatchResource.php
│   │   │   └── UserResource.php
│   │   ├── Middleware/
│   │   │   ├── AssignRequestId.php               # X-Request-Id + masked IP shared through Context
│   │   │   └── ResolveFacilityScope.php          # validates facility_id / region_code
│   │   └── Support/
│   │       └── ApiErrorRenderer.php              # standard error object
│   ├── Console/Commands/
│   │   └── MarkStaleFacilitiesCommand.php        # scheduled nightly
│   └── Providers/
│       └── AppServiceProvider.php                # data-driven rate limiters
├── bootstrap/
│   ├── app.php                                   # routing, middleware, exception rendering
│   └── providers.php                             # registers each module's service provider
├── config/
│   └── communitycare.php                         # display timezone (Asia/Manila) and app config
├── database/
│   ├── migrations/
│   │   ├── 2026_01_05_000050_create_roles_tables.php
│   │   ├── 2026_01_05_000100_create_geography_tables.php
│   │   ├── 2026_01_05_000200_create_facility_tables.php
│   │   ├── 2026_01_05_000300_create_facility_user_table.php
│   │   ├── 2026_01_05_000400_create_facility_change_requests_table.php
│   │   ├── 2026_01_05_000500_create_import_tables.php
│   │   └── 2026_01_05_000600_create_settings_and_audit_tables.php
│   ├── factories/       FacilityFactory.php  UserFactory.php ...
│   └── seeders/         RoleSeeder.php  FacilityTypeSeeder.php  ServiceSeeder.php  SettingSeeder.php
├── routes/
│   ├── api.php                                   # loads the three files below under /api/v1
│   ├── api/public.php
│   ├── api/auth.php
│   ├── api/admin.php
│   └── console.php                               # scheduler
├── tests/
│   ├── Unit/Domain/Facilities/ApproveFacilityActionTest.php
│   ├── Unit/Domain/Settings/CachedSettingsRepositoryTest.php
│   ├── Feature/Api/V1/Public/FacilitySearchTest.php
│   ├── Feature/Api/V1/Admin/ChangeRequestApprovalTest.php
│   ├── Feature/Api/V1/Admin/FacilityScopeTest.php
│   └── Contract/ImportSourceAdapterContractTest.php
├── .env.example
├── composer.json
└── phpunit.xml
```

### 7.4 What goes where (backend)

| Folder | Holds | Must not hold |
|---|---|---|
| `Http/Controllers` | Calls to one Action, returns a Resource | Business rules, queries |
| `Http/Requests` | Validation rules and messages | Authorization logic beyond `authorize()` delegating to a Policy |
| `Domain/*/Actions` | One use case, its transaction, its event | HTTP or request objects |
| `Domain/*/Contracts` | Interfaces | Implementations |
| `Domain/*/Repositories` | Eloquent queries behind an interface | Business decisions |
| `Domain/*/Events` | Immutable IDs and minimal fields | Personal or medical data |
| `Domain/*/Listeners` | One side effect each, idempotent | Work that must succeed with the main change |
| `Domain/*/Data` | Typed DTOs | Database access |

### 7.5 Web file structure (apps/web, React + TypeScript + Tailwind CSS)

Code is grouped by **feature**: each admin page or public page owns its components, data hooks, and types. Shared UI building blocks live in `components/ui`.

```
apps/web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js            # reads packages/design-tokens
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── index.css                 # @tailwind base; @tailwind components; @tailwind utilities
    ├── app/
    │   ├── App.tsx
    │   ├── router.tsx            # public routes + /admin routes
    │   ├── providers.tsx         # query client, auth, theme (dark mode)
    │   └── layouts/
    │       ├── PublicLayout.tsx
    │       └── AdminLayout.tsx   # sidebar, top bar, facility scope picker
    ├── components/ui/            # Button, Badge, Card, Table, Modal, SlideOver, Tabs, Toggle, Field
    ├── features/
    │   ├── directory/            # public search + facility detail
    │   │   ├── pages/            SearchPage.tsx  FacilityDetailPage.tsx
    │   │   ├── components/       FacilityCard.tsx  FilterBar.tsx  MapView.tsx  VerificationBadge.tsx
    │   │   ├── api/              useFacilities.ts  useFacility.ts
    │   │   └── types.ts
    │   ├── admin-overview/       # dashboard + single-facility dashboard
    │   ├── admin-facilities/
    │   ├── review-queue/
    │   ├── imports/
    │   ├── locations/
    │   ├── assistant/
    │   ├── health-programs/
    │   ├── team/
    │   ├── audit-log/
    │   ├── settings/
    │   └── auth/                 # login, forgot password
    ├── hooks/                    useFacilityScope.ts  useDebounce.ts
    ├── lib/                      api.ts (wraps packages/api-client)  format.ts
    ├── i18n/                     en.json  fil.json
    └── test/                     setup.ts
```

### 7.6 Mobile file structure (apps/mobile, React Native + Expo)

```
apps/mobile/
├── app.json
├── package.json
├── tailwind.config.js            # only if NativeWind is chosen (Section 18)
└── src/
    ├── app/                      # Expo Router screens
    │   ├── _layout.tsx
    │   ├── index.tsx             # search
    │   ├── facilities/[id].tsx   # facility detail
    │   └── saved.tsx
    ├── components/               FacilityCard.tsx  VerificationBadge.tsx
    ├── features/directory/       api/  components/  types.ts
    ├── lib/                      api.ts  secure-storage.ts (tokens)
    └── i18n/                     en.json  fil.json
```

### 7.7 Shared packages

```
packages/
├── api-client/
│   ├── package.json
│   └── src/index.ts              # generated from docs/api-spec.yaml; do not edit by hand
└── design-tokens/
    ├── package.json
    └── src/
        ├── colors.ts             # brand navy, teal, status colors
        ├── spacing.ts
        ├── typography.ts
        └── index.ts              # consumed by web and mobile Tailwind configs
```

### 7.8 Naming conventions

| Item | Convention | Example |
|---|---|---|
| PHP classes | StudlyCase, one class per file | `FacilityPolicy.php` |
| Actions | Verb + noun + `Action` | `ApproveFacilityAction` |
| Events | Past tense business fact | `FacilityApproved` |
| Listeners | Verb + object | `NotifySubmitter` |
| Interfaces | Role name, no `Interface` suffix | `FacilityReader` |
| Database tables | snake_case, plural | `facility_change_requests` |
| Pivot tables | Singular names, alphabetical | `facility_user`, `role_user` |
| Migrations | Date + verb + table | `2026_01_05_000300_create_facility_user_table.php` |
| API routes | kebab-case, plural nouns | `/admin/change-requests/{id}/approve` |
| React components | PascalCase `.tsx` | `FacilityCard.tsx` |
| React hooks | `use` + name `.ts` | `useFacilityScope.ts` |
| Web feature folders | kebab-case | `review-queue/` |

### Implementation conventions

- Controllers coordinate requests and contain no business logic.
- Form Requests validate; API Resources shape responses; Policies authorize on the server.
- Multi-step updates run in database transactions inside Actions.
- Modules call each other only through interfaces or events, never through each other's models directly.
- Feature tests cover API behaviour and authorization; unit tests cover Actions and rules; contract tests cover every adapter.
- Publish an OpenAPI specification and generate the typed API client once endpoint contracts stabilize.

<div class="page-break"></div>

## 8. Database Schema (MySQL 8)

### 8.1 Conventions

- **MySQL 8.0 or later**, InnoDB engine, `utf8mb4` character set with `utf8mb4_0900_ai_ci` collation (supports Filipino names and accents).
- Internal primary keys are `BIGINT UNSIGNED`; public identifiers are ULIDs (`CHAR(26)`) so IDs in URLs cannot be guessed.
- Every table has `created_at` and `updated_at`; foreign keys and indexes exist for every common filter.
- Status columns are `VARCHAR` backed by PHP enums (not MySQL `ENUM`), so adding a state needs no table rebuild.
- Timestamps are stored in UTC and returned in ISO 8601 with the `+08:00` offset (Asia/Manila).

### 8.2 Identity and geography

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

### 8.3 Facility directory

| Table | Fields / purpose |
|---|---|
| facility_types | id, slug, name, description |
| facilities | id, public_id, source_id, name, facility_type_id, address, region_id, province_id, city_municipality_id, barangay_id, `location POINT NOT NULL SRID 4326`, latitude, longitude, verification_status, **publication_status**, verified_at, **verified_by**, **verification_method**, **review_notes**, timestamps |
| services | id, slug, name, category, description |
| facility_services | id, facility_id, service_id, availability_status, source_id, verified_at |
| facility_contacts | id, facility_id, contact_type, value, is_public |
| facility_hours | id, facility_id, day_of_week, opens_at, closes_at, notes |
| **facility_hour_exceptions** (new) | id, facility_id, date, is_closed, opens_at, closes_at, reason (holidays, temporary closures) |
| facility_sources | id, facility_id, source_name, source_url, source_record_id, checked_at, imported_at |

### 8.4 Review and imports

| Table | Fields / purpose |
|---|---|
| **facility_change_requests** (new) | id, facility_id, submitted_by, origin (staff / verifier / import), changes (JSON: field → before/after), status (submitted / approved / rejected / withdrawn), reviewed_by, reviewed_at, reason, timestamps |
| import_batches | id, source_name, source_version, file_path, usage_terms, started_by, started_at, finished_at, status, current_step, records_processed, error_summary |
| **import_staging_records** (new) | id, import_batch_id, source_record_id, payload (JSON, normalized), match_status (new / updated / unchanged), matched_facility_id, flags (JSON), decision (pending / approved / rejected) |
| **duplicate_candidates** (new) | id, import_batch_id, staging_record_id, facility_id, reason (name+address / coordinates), score, resolution, resolved_by, resolved_at |

### 8.5 Operations and settings

| Table | Fields / purpose |
|---|---|
| **settings** (new) | key (primary), value (JSON), updated_by, timestamps. Type, default and validation rules live in `SettingsSchema` (code); a missing row means the default. |
| audit_logs | id, event_key (unique, for idempotency), actor_id, action, resource_type, resource_id, before (JSON, redacted), after (JSON, redacted), ip_masked, request_id, created_at |
| **usage_events** (new) | id, event (search / profile_view / call_click / directions_click), facility_id (nullable), region_id, query_hash, session_hash, created_at. Anonymous: no user ID, no raw IP. |
| notifications | id, user_id, type, status, sent_at, read_at |
| jobs, failed_jobs | Laravel queue tables for queued listeners |

### 8.6 Later phases

| Table | Fields / purpose |
|---|---|
| clinic_availability | id, facility_id, service_id, starts_at, ends_at, capacity |
| appointments | id, patient_id, facility_id, service_id, starts_at, status, reference_code |
| appointment_events | id, appointment_id, actor_id, old_status, new_status, created_at |
| health_programs | id, title, category, description, starts_at, ends_at, published_at |
| program_facilities | program_id, facility_id |
| knowledge_documents | id, title, source_url, version, verified_at, published_at |

### 8.7 Relationship summary

- One facility has many contacts, hours, hour exceptions, sources, change requests, and facility-service associations.
- Facilities and services are many-to-many through `facility_services`.
- Users and facilities are many-to-many through `facility_user` (staff assignment).
- One import batch has many staging records and duplicate candidates.
- Health programs and facilities are many-to-many through `program_facilities`.
- Appointment events and audit logs preserve history; neither stores medical data.

### 8.8 MySQL-specific notes (replacing PostGIS)

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

### 8.9 Data modeling notes

- Preserve external source identifiers to support reliable re-imports and deduplication.
- Track the source and last verification date for every important public claim.
- Keep **verification status** (our review) separate from **publication status** (visible to the public) and from any externally sourced accreditation claim.
- Model service availability separately from whether a facility generally offers that service.
- For bookings, enforce capacity with transactions and row locking (`SELECT ... FOR UPDATE`) or uniqueness rules.
- Avoid medical history, diagnoses, prescriptions, and clinical notes in the initial directory MVP.

<div class="page-break"></div>

## 9. API Design

### 9.1 Conventions

- All endpoints are prefixed with `/api/v1` and return JSON.
- Public directory endpoints need no account; protected operations require authentication and a Policy check.
- IDs in URLs are public ULIDs. Dates are ISO 8601 with offset.
- List endpoints are paginated with `page` and `per_page` (maximum from the `api.max_page_size` setting, default 50).
- Errors always use the same error object (Section 9.8).

### 9.2 Public endpoints

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

### 9.3 Facility search parameters

- `q`: facility name or address (full-text).
- `region_code`, `province_code`, `city_code`, `barangay_code`: geographic filters (PSGC).
- `type`: facility type; `service`: service category.
- `lat`, `lng`, `radius_km`: nearby search; coordinates validated, radius capped.
- `verified_only`: restrict to verified records.
- `page`, `per_page`: pagination with an enforced maximum.

Example: `GET /api/v1/facilities?city_code=0405802000&service=immunization&page=1`

### 9.4 Authentication endpoints

Decision: **Laravel Sanctum**. The web app uses a cookie-based session with CSRF protection; the mobile app uses personal access tokens kept in secure device storage.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/v1/auth/register | Create an account. |
| POST | /api/v1/auth/login | Authenticate (rate-limited). |
| POST | /api/v1/auth/logout | End session or revoke current token. |
| GET | /api/v1/me | Current user profile, roles, and assigned facilities. |
| POST | /api/v1/auth/forgot-password | Request password reset. |
| POST | /api/v1/auth/verify-email | Verify email if enabled. |

### 9.5 Administration endpoints

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
| GET, POST, PATCH | /api/v1/admin/knowledge-documents | Manage approved assistant sources |

### 9.6 Appointment endpoints (later phase)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/v1/facilities/{id}/availability | Available slots. |
| POST | /api/v1/appointments | Request an appointment (idempotency key required). |
| GET | /api/v1/me/appointments | List own appointments. |
| GET | /api/v1/appointments/{id} | View an authorized appointment. |
| POST | /api/v1/appointments/{id}/cancel | Cancel or request cancellation. |
| POST | /api/v1/staff/appointments/{id}/confirm | Confirm a booking. |
| POST | /api/v1/staff/appointments/{id}/complete | Mark completed. |

### 9.7 API contract rules

- Use appropriate HTTP status codes and the standard error object.
- Validate all query and body inputs; rate-limit login, search, and AI endpoints (limits come from `settings`).
- Never trust client-supplied role, owner, facility assignment, price, or booking status.
- Use API Resources so internal fields (for example `review_notes`) never reach public endpoints.
- Document pagination, sorting, filters, and the deprecation/versioning policy in the OpenAPI file.
- Use idempotency keys for retry-sensitive booking operations.

### 9.8 Response examples

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

<div class="page-break"></div>

## 10. Roles and Permissions

Authorization is enforced on the server with Laravel Policies and Gates. Frontend controls improve usability but are not security boundaries.

| Capability | Guest | Patient | Facility staff | Verifier | System admin |
|---|---|---|---|---|---|
| Search public facilities | Yes | Yes | Yes | Yes | Yes |
| View published programs | Yes | Yes | Yes | Yes | Yes |
| Manage own account | No | Yes | Yes | Yes | Yes |
| Request appointments | No | Yes | Optional | No | No |
| View own appointments | No | Yes | No | No | No |
| Manage assigned facility appointments | No | No | Yes | No | Optional |
| Edit assigned facility info | No | No | Limited | Review only | Yes |
| Verify facility records | No | No | No | Yes | Yes |
| Import datasets | No | No | No | Authorized | Yes |
| Manage roles | No | No | No | No | Yes |
| Access audit logs | No | No | Limited if needed | Limited | Authorized |

### Authorization rules

- Enforce record ownership and facility assignment (`facility_user`) on every protected request.
- A verifier does not automatically get access to patient appointment details.
- Editing and approval are separated (four-eyes review): the submitter of a change request can never approve it.
- Apply least privilege and run a quarterly access review of staff and admin accounts.
- Log sensitive administrative changes without copying private medical data into logs.

### Facility scope

- Admins and verifiers can view the dashboard for all facilities, one region, or one facility.
- Facility staff see only their assigned facilities; with a single assignment, the console opens directly on it.
- The selected scope is sent to the API as `facility_id` / `region_code` and checked by Policies on every call.

## 11. Data Import and Verification

The directory's usefulness depends on provenance, freshness, and correction workflows. Investigate the Department of Health's National Health Facility Registry (NHFR) and other official sources. Confirm formats, usage terms, update frequency, and whether API access is offered before building an automated connector.

### Import workflow

1. **Acquire**: record the file's source, date, version, and usage terms on `import_batches`.
2. **Stage**: load records into `import_staging_records`, never directly over published records.
3. **Normalize**: standardize facility types, contact formats, addresses, and PSGC codes.
4. **Match**: match on source identifiers first; names and addresses only propose `duplicate_candidates`, never automatic merges.
5. **Flag**: flag conflicting coordinates (over `imports.coordinate_conflict_km`), duplicates, missing identifiers, and stale records.
6. **Review**: authorized staff review material changes and verify high-impact fields.
7. **Publish**: approved records are published and `ImportBatchPublished` is raised; batch history is retained.
8. **Refresh**: schedule refreshes only at a cadence the source and team can support.

### Verification states

| State | Meaning |
|---|---|
| draft | Record is incomplete or not ready for public display. |
| pending_review | Record or correction is awaiting review. |
| verified | Required fields were checked against a defined source or process. |
| rejected | Submitted data failed review; reason kept internally. |
| stale | Last verification is older than `verification.stale_after_days` (default 180). |

### Publication states

| State | Meaning |
|---|---|
| unpublished | Not visible in public apps. |
| published | Visible in public apps, with its verification state shown. |
| withdrawn | Previously published, hidden pending review (reason recorded). |

### Change request lifecycle

```
submitted --approve (by a different user)--> approved --> facility updated, FacilityApproved
    |
    +--reject (reason required)-----------> rejected --> FacilityRejected
    |
    +--withdraw (by submitter)------------> withdrawn
```

<div class="callout">Important distinction: the platform's verification state describes its own review process. It must not be presented as a substitute for a regulator's license or accreditation status.</div>

### Data-quality fields

- `source_name`, `source_record_id`, `source_url`, `imported_at`, `checked_at`, `verified_at`
- `verification_method`, `verified_by`, `review_notes`, change history (`facility_change_requests`)
- Separate status fields for publication, service availability, and externally sourced accreditation claims

<div class="page-break"></div>

## 12. AI Assistant Design

The AI assistant helps users find services and understand approved public information. It does not diagnose, prescribe, or make clinical decisions.

### Request flow

1. The client sends a question to Laravel.
2. Laravel validates and rate-limits the request.
3. A retrieval service searches approved facility records and `knowledge_documents`.
4. The AI provider receives the question plus only the relevant public context.
5. The application returns the answer, supporting sources, and source freshness.
6. If information is missing or stale, the assistant says so and directs the user to the facility or an official source.

### Safeguards

- Do not allow the model to invent clinic hours, service availability, accreditation, or prices.
- Show source links and last-verified dates for factual facility claims.
- Keep provider credentials server-side; monitor cost and rate limits.
- Do not send identifiable patient or medical information to an AI provider without a reviewed legal basis, privacy controls, and agreements.
- For possible emergencies, tell the user to call **911** or go to the nearest emergency room; the assistant is never an emergency triage tool.
- Test for prompt injection in source documents, unsupported claims, and harmful or misleading answers.

### Implementation

Create a `KnowledgeAssistantService` with an `AiProvider` interface (dependency inversion), so providers can be swapped without changing the service. Start with database filters and approved documents. The `KnowledgeDocumentPublished` and `FacilityApproved` events keep the retrieval index current. Add embeddings or vector search only if evaluation shows it materially improves retrieval.

## 13. Web Frontend and Admin Console (Tailwind CSS)

### Stack

- **React + TypeScript** built with Vite.
- **Tailwind CSS** for styling, configured from the shared `packages/design-tokens`, so web and (optionally, through NativeWind) mobile use the same colors, spacing, and type scale.
- Typed API client generated from the OpenAPI file; server state managed with a query library such as TanStack Query.
- Dark mode via Tailwind's `class` strategy.

```js
// apps/web/tailwind.config.js
import tokens from '@communitycare/design-tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: tokens.colors,          // brand teal, navy, status colors
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: tokens.radius,
    },
  },
};
```

### Admin console pages

| Page | Main data | Notes |
|---|---|---|
| Overview | `/admin/stats` | All facilities, a region, or one facility (facility scope). |
| Facilities | `/admin/facilities` | Status tabs, filters, bulk "send to review", detail side panel. |
| Review queue | `/admin/review-queue` | Approve or reject; self-approval disabled (four-eyes). |
| Imports | `/admin/import-batches` | Pipeline progress, counts, flags, retry, publish. |
| Locations | `/locations/*` + stats | PSGC hierarchy browser with coverage per area. |
| AI assistant | assistant metrics, documents | Test console, guardrails, evaluation results. |
| Health programs | `/admin/health-programs` | Program cards, editor, participating facilities. |
| Team & roles | `/admin/users` | Members, invites, permission matrix, access review. |
| Audit log | `/admin/audit-logs` | Filterable, before/after view with redacted values. |
| Settings | `/admin/settings` | Verification thresholds, rate limits, notifications, security. |

### UI rules

- Meet **WCAG 2.1 AA**: keyboard navigation, visible focus, labels on every control, 4.5:1 text contrast.
- Show verification state and last-verified date beside every facility, with the "not a license or accreditation" notice.
- Support English first, with Filipino translation planned; keep all strings in translation files.
- Never treat hidden buttons as security; the API decides.

<div class="page-break"></div>

## 14. Security, Privacy, and Compliance

The Philippine Data Privacy Act of 2012 (Republic Act No. 10173) treats health information as sensitive personal information. Consult the National Privacy Commission and qualified counsel before processing personal or health data. This document is an engineering plan, not legal advice or a compliance certification.

### Minimum security baseline

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

### Clinical-data boundary

Do not include diagnoses, prescriptions, lab results, or full medical histories in the initial MVP. If these are later needed, treat them as a separate clinical-record system with its own governance, privacy review, access controls, auditability, retention policies, and clinical workflows.

### Emergency boundary

The directory must not imply that a facility is open or can receive an emergency patient unless the information is current and verified. Label data freshness clearly and direct emergencies to 911.

## 15. Testing and Deployment

### Testing strategy

| Test type | Examples |
|---|---|
| Unit | Actions, verification rules, stale rule, status transitions, settings parsing. |
| Feature / API | Search filters, pagination, validation, response shape, error object, auth boundaries. |
| Authorization | Guests blocked from protected routes; users cannot see others' appointments; staff limited to assigned facilities; self-approval refused. |
| Events | `Event::fake()` asserts each Action raises its event; listener tests prove idempotency (running twice writes once). |
| Contract | Every `ImportSourceAdapter` and `AiProvider` implementation passes the same contract suite. |
| Import | Repeat imports are safe; duplicates are flagged; failed batches do not change published data. |
| Database | Migrations run on the production MySQL version in CI; spatial queries and axis order are tested. |
| Concurrency | Appointment capacity is not exceeded by simultaneous requests. |
| AI evaluation | Answers grounded in sources; missing data acknowledged; no invented facts; prompt-injection tests. |
| Accessibility | Keyboard navigation, labels, contrast, screen-reader support, scalable text. |
| Operational | Backup restoration, queue retry behaviour, monitoring, deployment rollback. |

### Deployment checklist

- Separate development, staging, and production environments.
- HTTPS and private MySQL/Redis networking.
- Run migrations as a controlled release step and test the rollback strategy.
- Run queue workers for queued listeners and the scheduler for nightly jobs (stale rule, digests).
- Configure health checks, exception monitoring, failed-job alerts, and queue-length alerts.
- Set backup retention and periodically test restoring into a clean environment.
- Use mobile secure storage for tokens and configure production app signing.
- Review CORS, cookie domain, CSRF, rate limiting, and upload limits.
- Document incident response, service ownership, and data refresh responsibilities.

<div class="page-break"></div>

## 16. Implementation Roadmap

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

### Suggested build order

1. Create the monorepo and the Laravel API skeleton with module folders, settings, and event wiring.
2. Implement facility and geography migrations (MySQL) with factories and seeders.
3. Build import staging and source provenance before importing a large dataset.
4. Implement public facility endpoints and API tests.
5. Build the web directory and the admin verification console with Tailwind.
6. Add mobile screens against the same API.
7. Add AI only after reliable source data is available.
8. Add appointment workflows only with a participating facility and a confirmed operational process.

## 17. MVP Acceptance Checklist and Definition of Done

Use this checklist to decide whether the first release is ready for a limited pilot.

- [ ] Facility search works across the supported geographic hierarchy.
- [ ] Facility detail pages show source attribution and last-verified dates.
- [ ] Unverified or rejected records are not presented as verified.
- [ ] Repeated imports do not create duplicates or silently overwrite reviewed changes.
- [ ] The admin workflow separates editing, reviewing, and publishing; self-approval is refused.
- [ ] Public APIs do not expose private account data or internal-only fields.
- [ ] Authorization tests prove users cannot access other users' or unassigned facilities' resources.
- [ ] Every state change raises its domain event, and listeners are idempotent.
- [ ] The mobile app works on target Android/iOS devices and handles weak connectivity gracefully.
- [ ] The interface meets WCAG 2.1 AA for keyboard navigation and labels.
- [ ] Backups can be restored and a rollback procedure is documented.
- [ ] AI answers are evaluated against approved sources and acknowledge missing or stale information.
- [ ] Privacy notice, data-source terms, incident handling, and data-refresh ownership are documented.

### Definition of done

A feature is complete only when it has validation, authorization, its domain events, relevant automated tests, clear error handling, logging that avoids sensitive data, and documentation for operational ownership. A working UI alone is not done.

<div class="page-break"></div>

## 18. References, Assumptions, and Open Decisions

### References to review during implementation

- Department of Health, National Health Facility Registry: facility data, download options, source terms, refresh procedures.
- Philippine Statistics Authority, PSGC: official geographic codes; confirm the current release.
- National Privacy Commission: Philippine data privacy guidance (RA 10173).
- Laravel documentation: Sanctum, authorization (Policies and Gates), events and listeners, queues, scheduling.
- MySQL 8 reference manual: spatial data types and functions, spatial indexes, InnoDB full-text search.
- Tailwind CSS documentation: configuration, dark mode, theming.
- Expo documentation: React Native development and release workflow.

### Assumptions

- The first release is a public directory, not a clinical record system.
- Facility data usage and redistribution terms will be confirmed before import or publication.
- Appointment booking requires a participating facility and a real availability and confirmation process.
- MySQL 8 spatial and full-text features are sufficient for the MVP's search; revisit if search quality or speed falls short.
- The roadmap assumes one developer or a small team and will be revised after validating data quality and scope.

### Open decisions

| Decision | Options | Needed by |
|---|---|---|
| Map provider | To be selected (cost, Philippine coverage, terms) | Phase 3 |
| Hosting region and managed MySQL provider | To be selected (latency to the Philippines, data residency) | Phase 1 |
| AI provider | To be selected behind the `AiProvider` adapter | Phase 6 |
| SMS / email providers | To be selected (consent, cost) | Phase 7 |
| Mobile styling | NativeWind (shared Tailwind tokens) or React Native StyleSheet with shared tokens | Phase 5 |
| Search engine | Stay on MySQL `FULLTEXT`, or add a dedicated search engine if needed | After Phase 3 evaluation |

### Document control

| Field | Value |
|---|---|
| Project | CommunityCare AI |
| Document | Technical Documentation & System Design |
| Version | 1.1, revised design blueprint (November 7, 2026) |
| Supersedes | Version 1.0, initial design blueprint |
| Scope | Public healthcare directory for the Philippines; web and mobile |
| Status | Proposed architecture; validate data access, privacy, and operational assumptions before launch |

<p class="end">End of document</p>
