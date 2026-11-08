# References, Assumptions and Open Decisions

[← Documentation index](README.md)

## References to review during implementation

- Department of Health, National Health Facility Registry: facility data, download options, source terms, refresh procedures.
- Philippine Statistics Authority, PSGC: official geographic codes; confirm the current release.
- National Privacy Commission: Philippine data privacy guidance (RA 10173).
- Laravel documentation: Sanctum, authorization (Policies and Gates), events and listeners, queues, scheduling.
- MySQL 8 reference manual: spatial data types and functions, spatial indexes, InnoDB full-text search.
- Tailwind CSS documentation: configuration, dark mode, theming.
- Expo documentation: React Native development and release workflow.

## Assumptions

- The first release is a public directory, not a clinical record system.
- Facility data usage and redistribution terms will be confirmed before import or publication.
- Appointment booking requires a participating facility and a real availability and confirmation process.
- MySQL 8 spatial and full-text features are sufficient for the MVP's search; revisit if search quality or speed falls short.
- The roadmap assumes one developer or a small team and will be revised after validating data quality and scope.

## Open decisions

| Decision | Options | Needed by |
|---|---|---|
| Map provider | To be selected (cost, Philippine coverage, terms) | Phase 3 |
| Hosting region and managed MySQL provider | To be selected (latency to the Philippines, data residency) | Phase 1 |
| AI provider | To be selected behind the `AiProvider` adapter | Phase 6 |
| SMS / email providers | To be selected (consent, cost) | Phase 7 |
| Mobile styling | NativeWind (shared Tailwind tokens) or React Native StyleSheet with shared tokens | Phase 5 |
| Search engine | Stay on MySQL `FULLTEXT`, or add a dedicated search engine if needed | After Phase 3 evaluation |

## Document control

| Field | Value |
|---|---|
| Project | CommunityCare AI |
| Document | Technical Documentation & System Design |
| Version | 1.1, revised design blueprint (November 7, 2026) |
| Supersedes | Version 1.0, initial design blueprint |
| Scope | Public healthcare directory for the Philippines; web and mobile |
| Status | Proposed architecture; validate data access, privacy, and operational assumptions before launch |

## Maps

- OpenStreetMap copyright and attribution: https://www.openstreetmap.org/copyright
- Nominatim usage policy (1 request/second, identifying User-Agent, caching): https://operations.osmfoundation.org/policies/nominatim/
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Leaflet: https://leafletjs.com · react-leaflet: https://react-leaflet.js.org
- PSGC API (PSA PSGC as JSON): https://psgc.gitlab.io/api/
