# Product Overview

[← Documentation index](README.md)

## 2. Executive Summary

CommunityCare AI is a public healthcare discovery platform that helps people in the Philippines find healthcare facilities, understand which services are listed, access verified public information, and eventually request appointments. It consists of a React web portal, a React Native mobile app, and a shared Laravel API backed by MySQL.

The first release focuses on information access rather than becoming a full electronic medical record (EMR) or clinical decision-support system. This reduces scope and minimizes collection of sensitive patient information.

### Product goals

- Make public healthcare facilities easier to discover by location, facility type, and service.
- Show contact information, operating hours, source provenance, and the last verification date.
- Give authorized administrators a controlled workflow to review and publish corrections.
- Provide an AI assistant that answers questions from approved public information and clearly acknowledges gaps.
- Create a foundation for optional appointment coordination and public health program announcements.

### Non-goals for the initial MVP

- Diagnosing conditions, recommending treatment, or replacing medical professionals.
- Storing comprehensive medical histories, prescriptions, laboratory results, or clinical notes.
- Guaranteeing real-time clinic capacity or appointment availability without a confirmed integration.
- Claiming that a facility is currently licensed, accredited, or eligible for a benefit unless the relevant authoritative source supports that claim.

## 3. Product Scope and MVP

### Primary users

| User type | Primary needs |
|---|---|
| Public visitor | Search facilities, view services and contacts, check source dates, open directions. |
| Registered user / patient | Save preferences and, in a later phase, request and track appointments. |
| Facility staff | Maintain authorized facility information and handle appointment requests for assigned facilities. |
| Data verifier | Review facility records, source evidence, imports, and proposed corrections. |
| System administrator | Manage roles, platform configuration, imports, security controls, and audit review. |

### MVP features

1. Facility directory with search, pagination, facility types, service filters, and geographic filters.
2. Facility detail pages with address, public contacts, listed services, opening hours, data source, and last-verified date.
3. Admin console for importing, reviewing, correcting, approving, and publishing records.
4. Location hierarchy for region, province, city/municipality, and barangay using PSGC codes.
5. Responsive, accessible web UI (Tailwind CSS) and a mobile app that consumes the same API.
6. Operational basics: logs, backups, monitoring, automated tests, and documented data refresh procedures.

### Phase 2 features

- Appointment request and confirmation workflows with clinic-approved schedules.
- Health program announcements and facility participation.
- Push, email, or SMS notifications where consent, provider contracts, and cost are addressed.
- AI information assistant grounded in approved source records.

### Success measures

Each measure is computed from data the platform stores, so it can be shown on the admin dashboard.

| Measure | Computed from |
|---|---|
| Search success rate (searches that open a facility profile) | `usage_events` |
| Share of published records with a traceable source and recent verification | `facilities`, `facility_sources` |
| Duplicate or conflicting records detected and resolved | `duplicate_candidates`, `facility_change_requests` |
| Mobile performance, accessibility results, API error rates | Monitoring and CI reports |
| If booking launches: request completion and clinic-confirmed rate | `appointments`, `appointment_events` |
