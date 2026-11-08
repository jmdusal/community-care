# Backend Engineering Principles

[← Documentation index](README.md)

The backend applies three principles together. **SOLID** keeps each class small and replaceable. **Data-driven** design keeps rules and reference values in data instead of code. **Event-driven** design separates the main business change from its side effects.

## 6.1 SOLID principles

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

## 6.2 Data-driven design

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

The event catalogue, flow and rules are in [Domain Events](events.md).
