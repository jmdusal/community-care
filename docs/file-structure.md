# Repository and File Structure

[← Documentation index](README.md)

A monorepo keeps the web app, mobile app, API, and documentation together. Share API contracts and design tokens; keep platform-specific UI separate. The trees below are the target structure; files are added as each phase is built.

## 7.1 Monorepo

```
communitycare-ai/
├── apps/
│   ├── api/                  # Laravel REST API ([Section 7.3](file-structure.md))
│   ├── web/                  # React + TypeScript + Tailwind CSS ([Section 7.5](file-structure.md))
│   └── mobile/               # React Native + Expo ([Section 7.6](file-structure.md))
├── packages/
│   ├── api-client/           # typed client generated from docs/api-spec.yaml
│   └── design-tokens/        # colors, spacing, typography -> Tailwind config
├── infrastructure/
│   └── deployment/           # host-specific config; local dev uses Herd + DBngin, no Docker
│       ├── staging.env.example
│       └── production.env.example
├── docs/
│   ├── README.md                 # index of all documentation
│   ├── local-development.md      # Herd + DBngin setup
│   ├── product-overview.md       # goals, users, MVP scope
│   ├── architecture.md           # stack, request flow, deployment
│   ├── backend-principles.md     # SOLID + data-driven
│   ├── events.md                 # event-driven design and catalogue
│   ├── file-structure.md         # this file
│   ├── database.md               # MySQL schema
│   ├── api.md                    # /api/v1 contract
│   ├── community-care-data.md    # data sources, import, verification
│   ├── roles-and-permissions.md
│   ├── security.md
│   ├── ai-assistant.md
│   ├── frontend.md               # React + Tailwind
│   ├── testing-and-deployment.md
│   ├── roadmap.md
│   ├── acceptance-checklist.md
│   ├── references.md
│   ├── changelog.md
│   └── api-spec.yaml             # OpenAPI 3 contract (added in phase 3)
├── .github/workflows/
│   ├── api.yml               # PHP tests on MySQL 8 + Redis
│   ├── web.yml               # type-check, lint, tests, build
│   └── mobile.yml
└── README.md
```

## 7.2 Laravel domain modules

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

## 7.3 Backend file structure (apps/api)

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

## 7.4 What goes where (backend)

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

## 7.5 Web file structure (apps/web, React + TypeScript + Tailwind CSS)

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
    │   ├── assistant/            # public "Ask CommunityCare" page
    │   ├── ai-assistant/         # admin: test console, knowledge documents, guardrails
    │   ├── health-programs/
    │   ├── team/
    │   ├── audit-log/
    │   ├── settings/
    │   └── auth/                 # split-screen sign-in, forgot / reset password (components/BrandPanel, IconInput)
    ├── hooks/                    useFacilityScope.ts  useDebounce.ts
    ├── lib/                      api.ts (wraps packages/api-client)  format.ts
    ├── i18n/                     en.json  fil.json
    └── test/                     setup.ts
```

## 7.6 Mobile file structure (apps/mobile, React Native + Expo)

```
apps/mobile/
├── app.json
├── package.json
├── tailwind.config.js            # only if NativeWind is chosen ([Section 18](references.md))
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

## 7.7 Shared packages

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

## 7.8 Naming conventions

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

## Implementation conventions

- Controllers coordinate requests and contain no business logic.
- Form Requests validate; API Resources shape responses; Policies authorize on the server.
- Multi-step updates run in database transactions inside Actions.
- Modules call each other only through interfaces or events, never through each other's models directly.
- Feature tests cover API behaviour and authorization; unit tests cover Actions and rules; contract tests cover every adapter.
- Publish an OpenAPI specification and generate the typed API client once endpoint contracts stabilize.
