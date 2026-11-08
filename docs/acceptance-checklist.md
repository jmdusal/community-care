# MVP Acceptance Checklist

[← Documentation index](README.md)

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

## Definition of done

A feature is complete only when it has validation, authorization, its domain events, relevant automated tests, clear error handling, logging that avoids sensitive data, and documentation for operational ownership. A working UI alone is not done.
