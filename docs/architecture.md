# Architecture

[← Documentation index](README.md)

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

> **Note:** Do not start with microservices. A single well-structured Laravel deployment is enough for an initial public directory.
