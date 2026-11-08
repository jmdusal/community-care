# CommunityCare AI Documentation

A public healthcare directory for the Philippines: Laravel API, React + TypeScript + Tailwind web app, React Native + Expo mobile app, MySQL.

These files are the working version of the technical documentation. The PDF in `community-ai-technical/` is a snapshot of version 1.1; when the two differ, these files win.

## Start here

| If you want to… | Read |
|---|---|
| Run the project on your Mac | [local-development.md](local-development.md) |
| Understand what we are building and why | [product-overview.md](product-overview.md) |
| See what changed in version 1.1 | [changelog.md](changelog.md) |
| Know what is built and what comes next | [roadmap.md](roadmap.md) |

## Engineering

| File | What is inside |
|---|---|
| [architecture.md](architecture.md) | Technology stack, modular monolith, request flow, deployment |
| [backend-principles.md](backend-principles.md) | SOLID and data-driven design in Laravel, with examples |
| [events.md](events.md) | Event-driven design: event catalogue, flow, listener rules |
| [file-structure.md](file-structure.md) | Monorepo, backend, web, mobile and package file trees; naming conventions |
| [database.md](database.md) | MySQL schema, relationships, spatial and full-text notes |
| [api.md](api.md) | `/api/v1` endpoints, parameters, auth, response and error formats |
| [frontend.md](frontend.md) | React + Tailwind setup, design tokens, admin console pages, UI rules |
| [testing-and-deployment.md](testing-and-deployment.md) | Test strategy and deployment checklist |

## Data, access and safety

| File | What is inside |
|---|---|
| [community-care-data.md](community-care-data.md) | Data sources (NHFR, PSGC), import workflow, verification and publication states |
| [roles-and-permissions.md](roles-and-permissions.md) | Permission matrix, authorization rules, facility scope |
| [security.md](security.md) | RA 10173, security baseline, clinical-data and emergency boundaries |
| [ai-assistant.md](ai-assistant.md) | Grounded assistant design and safeguards |

## Release

| File | What is inside |
|---|---|
| [acceptance-checklist.md](acceptance-checklist.md) | MVP acceptance checklist and definition of done |
| [references.md](references.md) | References, assumptions and open decisions |

## Pilot readiness (phase 8)

- [Pilot checklist](pilot-checklist.md): go / no-go list before launch
- [Operations runbook](operations.md): backups, restore, outages, account problems
- [Guide for facility staff and facility admins](staff-guide.md)
