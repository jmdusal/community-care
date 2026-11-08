# Web Frontend and Admin Console

[← Documentation index](README.md)

## Stack

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

## Admin console pages

| Page | Main data | Notes |
|---|---|---|
| Overview | `/admin/stats` | All facilities, a region, or one facility (facility scope). |
| Facilities | `/admin/facilities` | Status tabs, filters, bulk "send to review", detail side panel. |
| Review queue | `/admin/review-queue` | Approve or reject; self-approval disabled (four-eyes). |
| Imports | `/admin/import-batches` | Pipeline progress, counts, flags, retry, publish. |
| Locations | `/locations/*` + stats | PSGC hierarchy browser with coverage per area. |
| AI assistant | assistant metrics, documents | Test console, guardrails, evaluation results.
| Health programs | `/admin/health-programs` | Program cards, editor, participating facilities. |
| Team & roles | `/admin/users` | Members, invites, permission matrix, access review. |
| Audit log | `/admin/audit-logs` | Filterable, before/after view with redacted values. |
| Settings | `/admin/settings` | Verification thresholds, rate limits, notifications, security. |

## UI rules

- Meet **WCAG 2.1 AA**: keyboard navigation, visible focus, labels on every control, 4.5:1 text contrast.
- Show verification state and last-verified date beside every facility, with the "not a license or accreditation" notice.
- Support English first, with Filipino translation planned; keep all strings in translation files.
- Never treat hidden buttons as security; the API decides.

## Component architecture (as built)

The web app is component-based in three layers. A page only composes components; it holds no markup that another screen could reuse.

| Layer | Folder | Rule | Examples |
|---|---|---|---|
| UI kit | `src/components/ui/` | Generic, no API calls, no business words. One component per file. | `Button` (+ `buttonClass` for links), `Pill`, `Panel`, `PageHead`, `StatStrip`, `Field`, `Select`, `Toggle`, `Segmented`, `SearchInput`, `Pagination`, `EmptyState`, `KeyValueList`, `Alert`, `Modal`, `Icon` |
| Feature components | `src/features/<feature>/components/` | Know the feature's data types; may call that feature's hooks. | `imports/components/BatchDetail`, `RecordReview`, `DecisionCell`; `directory/components/FacilityCard`, `VerificationBadge`, `OpeningHours` |
| Pages | `src/features/<feature>/<Name>Page.tsx` or `pages/` | Compose feature components; own page-level state (selection, URL params). | `ImportsPage`, `LocationsPage`, `SettingsPage`, `directory/pages/SearchPage` |

Each feature also has:

- `api.ts`: types and TanStack Query hooks (the only place that calls `lib/api.ts`);
- optional helpers such as `presentation.ts` (labels, colors) or `format.ts`.

```
apps/web/src/
├── app/                 # App, router, providers, layouts (AdminLayout, PublicLayout), navigation
├── components/ui/       # reusable UI kit
├── features/
│   ├── auth/            # LoginPage, RequireAuth, useAuth
│   ├── admin-overview/  # OverviewPage, SystemStatusCard
│   ├── directory/       # public SearchPage + FacilityPage and their components
│   ├── imports/         # ImportsPage + components/
│   ├── locations/       # LocationsPage + components/
│   └── settings/        # SettingsPage + components/
└── lib/                 # api client, cx()
```

Rules: props in, events out; no component reads another feature's internals; links that look like buttons use `buttonClass()` (never a button inside a link); every control has an accessible label.

### Added in phase 6

- `lib/assistant.ts`: shared assistant types, `useAssistantStatus`, `useAsk`, and `splitCitations` (unit tested).
- `components/shared/AssistantAnswerCard.tsx`: one answer with citation chips, sources and freshness. Used by both the public page and the admin console, so neither feature imports the other.
- `features/assistant/` (public): `AssistantPage`, `AskForm`, `Conversation`, `SuggestedQuestions`. Conversations live only in page state.
- `features/ai-assistant/` (admin): `AiAssistantPage`, `AssistantStats`, `ProviderStatus`, `PreviewConsole`, `KnowledgeBase`, `DocumentTable`, `DocumentEditor`, `GuardrailChecks`.
- `features/auth/`: the split-screen `AuthCard` (brand panel with a sample verified listing, form on the right; the brand panel is hidden on small screens) with `components/BrandPanel` and `components/IconInput` (leading icon and show/hide password).

### Search and dashboard scope

- **Search as you type:** every search box uses `lib/useLiveSearch` (commits ~300 ms after typing stops; Enter commits at once; follows back-button and "clear" changes). `SearchInput` shows a spinner while results load and a clear button. The public directory keeps the query in the URL without adding a history entry per keystroke. Lookups inside pickers use `useDebouncedValue`. The mobile search box works the same way.
- **Console-wide scope:** `components/shared/ScopePicker` sits in the admin top bar, backed by `lib/scope.tsx` (`ScopeProvider`, `useScope`, `scopeParams`; remembered on the device). Pages marked `scoped: true` in `navigation.ts` (Overview, Facilities, Review queue, Audit log) follow it; on other pages the picker is disabled. Pages remount when the scope changes. Previously: the Overview's `ScopePicker` is a searchable dropdown. Admins and verifiers choose all facilities, a region, or a single facility (type 2+ letters); facility staff choose among their assigned facilities. The choice is kept in the URL (`/admin?facility=…` or `?region=…`) and every card on the page follows it. With one facility selected, `OverviewStats` shows record status, profile views, calls and directions taps, and pending changes.

### Maps (Locations)

- **Leaflet + react-leaflet** with **OpenStreetMap** tiles: free, no API key. The attribution line on the map is required by OpenStreetMap's licence.
- `features/locations/components/AreaMapPanel` (panel, legend, states) lazy-loads `AreaMap` (the Leaflet map), so Leaflet's ~45 KB gzipped only downloads on the Locations screen. Colours come from `mapLegend.ts`.
- Tiles: `VITE_MAP_TILE_URL` (default `https://tile.openstreetmap.org/{z}/{x}/{y}.png`). OpenStreetMap's public tiles are fine for development and light admin use; for production traffic use a tile provider account (for example MapTiler or Stadia) or self-hosted tiles.
- `AreaPin` drops a pin (inline SVG, no image files) on the selected area's OpenStreetMap reference point (town proper for a city, the barangay's marked centre), labelled with its name; its popup shows the coordinates, a copy button and an "Open in OpenStreetMap" link. No pin is drawn when the parent area is shown instead (`approximate`).
