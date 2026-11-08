# CommunityCare Data: Sources, Import and Verification

[← Documentation index](README.md)

The directory's usefulness depends on provenance, freshness, and correction workflows. Investigate the Department of Health's National Health Facility Registry (NHFR) and other official sources. Confirm formats, usage terms, update frequency, and whether API access is offered before building an automated connector.

## Import workflow

1. **Acquire**: record the file's source, date, version, and usage terms on `import_batches`.
2. **Stage**: load records into `import_staging_records`, never directly over published records.
3. **Normalize**: standardize facility types, contact formats, addresses, and PSGC codes.
4. **Match**: match on source identifiers first; names and addresses only propose `duplicate_candidates`, never automatic merges.
5. **Flag**: flag conflicting coordinates (over `imports.coordinate_conflict_km`), duplicates, missing identifiers, and stale records.
6. **Review**: authorized staff review material changes and verify high-impact fields.
7. **Publish**: approved records are published and `ImportBatchPublished` is raised; batch history is retained.
8. **Refresh**: schedule refreshes only at a cadence the source and team can support.

## Verification states

| State | Meaning |
|---|---|
| draft | Record is incomplete or not ready for public display. |
| pending_review | Record or correction is awaiting review. |
| verified | Required fields were checked against a defined source or process. |
| rejected | Submitted data failed review; reason kept internally. |
| stale | Last verification is older than `verification.stale_after_days` (default 180). |

## Publication states

| State | Meaning |
|---|---|
| unpublished | Not visible in public apps. |
| published | Visible in public apps, with its verification state shown. |
| withdrawn | Previously published, hidden pending review (reason recorded). |

## Change request lifecycle

```
submitted --approve (by a different user)--> approved --> facility updated, FacilityApproved
    |
    +--reject (reason required)-----------> rejected --> FacilityRejected
    |
    +--withdraw (by submitter)------------> withdrawn
```

> **Note:** Important distinction: the platform's verification state describes its own review process. It must not be presented as a substitute for a regulator's license or accreditation status.

## Data-quality fields

- `source_name`, `source_record_id`, `source_url`, `imported_at`, `checked_at`, `verified_at`
- `verification_method`, `verified_by`, `review_notes`, change history (`facility_change_requests`)
- Separate status fields for publication, service availability, and externally sourced accreditation claims

## Implementation (phase 2)

### Sources and column mapping

Sources are configured in `apps/api/config/communitycare.php` under `imports` (data-driven: a new CSV source is a config entry, not code).

| Source key | Kind | File |
|---|---|---|
| `psa_psgc` | Geography | PSA PSGC release saved as CSV (`10-digit PSGC`, `Name`, `Geographic Level`) |
| `doh_nhfr` | Facilities | DOH NHFR export saved as CSV. **The expected headers must be confirmed against a real export.** |
| `facility_csv` | Facilities | CommunityCare template (`source_record_id`, `name`, `type`, `address`, `*_psgc`, `latitude`, `longitude`, `phone`, `email`, `website`, `services`) |

Required columns for facility sources: the source identifier and the name. A file without them fails before anything is staged.

### Flags

| Flag | Blocks publishing until decided | Meaning |
|---|---|---|
| `missing_name` | Row is invalid and never published | No facility name |
| `missing_identifier` | Yes | No source ID, so future re-imports cannot match it |
| `unknown_location` | Yes | City/municipality PSGC code not in the location tables (import PSGC first) |
| `duplicate_candidate` | Yes | Same source ID twice in the file, or a similar name in the same city (similarity from setting `imports.duplicate_name_similarity`, default 85) |
| `coordinate_conflict` | Yes | Re-imported coordinates moved more than `imports.coordinate_conflict_km` (default 1 km) |
| `invalid_psgc` | No | A code is not 10 digits; that code is dropped |
| `coordinates_out_of_bounds` | No | Coordinates outside the Philippines; they are dropped |

### Rules as built

- **Geography imports** are reference data: validated and upserted in one all-or-nothing transaction, published immediately. Parents come from the 10-digit code (`RR PPP MM BBB`); NCR cities have no province. Rows whose parent is missing are counted as `orphaned` and skipped.
- **Facility imports** stop at review. A batch can only be published when every flagged record has been approved or rejected.
- **Unchanged vs updated:** each published source record stores a hash of its normalized data; a re-import with the same hash is `unchanged` and only refreshes `checked_at`.
- **Publishing** writes in one transaction. Imported records become `verified` with `verification_method = import:<source>`, and new records are published.
- **Failed batches** never change published data.

### Command line

```sh
cd apps/api
php artisan communitycare:import psa_psgc /path/to/psgc.csv --source-version=2026-Q3 --terms="Public data, attribution required" --sync
php artisan communitycare:import doh_nhfr /path/to/nhfr.csv --source-version=2026-11-07 --terms="..." 
```

Without `--sync` the batch is queued; run `php artisan queue:work`. Review and publish facility batches on the Imports screen.

## Independent cities (HUCs and ICCs)

PSGC treats Highly Urbanized Cities and Independent Component Cities (for example Iligan, Cagayan de Oro, Cebu, Davao, Baguio, Bacolod, Iloilo, Zamboanga, Angeles) as **not part of any province**: they carry their own province-level code (Iligan is `1030900000`, not under Lanao del Norte's `1003500000`).

- `cities_municipalities.province_id` stays **null** for them, so provincial counts and filters follow PSA.
- `cities_municipalities.geographic_province_id` records the province they sit in geographically (from the PSGC API's `provinceCode`). It is used only to list them under that province on the Locations screen (with an "Independent city" badge) and to find them on the map.
- If that link is unknown (for example after importing PSA's CSV file, or Isabela City, whose geographic province Basilan is in another region), the region shows an **Independent cities** entry listing them, so they are never hidden.
- The public directory and the facility form list cities by region, so these cities have always been selectable there.
