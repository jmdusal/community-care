# CommunityCare AI

A public healthcare directory for the Philippines: find facilities, see their listed services and contacts, and check where each fact came from and when it was last verified.

| Part | Path | Stack |
|---|---|---|
| API | [`apps/api`](apps/api) | Laravel 13, PHP 8.4, MySQL, Sanctum |
| Web | [`apps/web`](apps/web) | React 19, TypeScript, Tailwind CSS 4, Vite |
| Design tokens | [`packages/design-tokens`](packages/design-tokens) | Shared colors and type for web and mobile |
| Mobile | `apps/mobile` (phase 5) | React Native + Expo |
| Documentation | [`docs/`](docs/README.md) | Architecture, data, API, security, roadmap |

## Quick start

Requires Laravel Herd and DBngin (MySQL). Full steps: [docs/local-development.md](docs/local-development.md).

```sh
cd apps/api && composer install && php artisan migrate --seed && herd link communitycare-api
cd ../.. && npm install && npm run dev:web
```

API: `http://communitycare-api.test/api/v1/health` · Web: the URL Vite prints.

## Status

Phase 1 (Foundation) is in place. See [docs/roadmap.md](docs/roadmap.md) for what comes next.

## Design references

- `admin-dashboard/`: clickable admin console prototypes (open `preview-saas.html`).
- `community-ai-technical/`: the version 1.1 technical documentation as a PDF.
