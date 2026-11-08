# Testing and Deployment

[← Documentation index](README.md)

## Testing strategy

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

## Deployment checklist

- Separate development, staging, and production environments.
- HTTPS and private MySQL/Redis networking.
- Run migrations as a controlled release step and test the rollback strategy.
- Run queue workers for queued listeners and the scheduler for nightly jobs (stale rule, digests).
- Configure health checks, exception monitoring, failed-job alerts, and queue-length alerts.
- Set backup retention and periodically test restoring into a clean environment.
- Use mobile secure storage for tokens and configure production app signing.
- Review CORS, cookie domain, CSRF, rate limiting, and upload limits.
- Document incident response, service ownership, and data refresh responsibilities.
