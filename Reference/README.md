# Modern Bug Tracker — Engineering Specification

## 1. Purpose

This repository specification defines a production-grade, Bugzilla-inspired issue tracking and engineering management platform with a modern architecture and additional AI, automation, Git/CI, analytics, and collaboration capabilities.

The product is **not a source-code fork of Bugzilla**. It is a clean-room implementation inspired by established issue-tracking concepts.

The UI/visual design is intentionally NOT specified here. The product owner will create the UI separately. The frontend implementation must consume the contracts in these documents without inventing business rules.

## 2. Documents

- `PRD.md` — product requirements, personas, scope, workflows, acceptance criteria.
- `ARCHITECTURE.md` — system architecture, services, boundaries, security, infrastructure, deployment.
- `DATABASE_SCHEMA.md` — PostgreSQL schema, relationships, indexes, constraints, audit model.
- `API_SPECIFICATION.md` — REST API conventions, endpoints, request/response contracts, errors, pagination, auth.
- `AI_FEATURE_SPECIFICATION.md` — AI capabilities, safety, retrieval, embeddings, prompts, evaluation and cost controls.
- `IMPLEMENTATION_PHASES.md` — ordered implementation plan, milestones, dependencies, tests and definition of done.
- `ENGINEERING_STANDARDS.md` — coding conventions, repository structure, testing, security, observability and Git rules.

## 3. Non-negotiable engineering principles

1. PostgreSQL is the source of truth for transactional application data.
2. Backend authorization is authoritative; frontend permissions are only UX hints.
3. Every tenant-scoped query must enforce organization/project scope.
4. Every state transition must be validated against the configured workflow.
5. Mutations must be auditable.
6. API contracts must be versioned.
7. Background jobs must be idempotent.
8. AI suggestions must never silently mutate user-owned data.
9. Search and analytics may be eventually consistent; issue state may not.
10. UI is replaceable. Business logic must not live in UI components.
11. Use UUIDs for internal identifiers and human-readable keys such as `PROJ-123` for issues.
12. Do not expose database IDs unnecessarily in public URLs.
13. Never store plaintext passwords, API tokens, OAuth secrets, or provider credentials.
14. Prefer boring, maintainable technology over unnecessary microservices.

## 4. Recommended stack

### Frontend
- Next.js
- React
- TypeScript
- TanStack Query
- Tailwind CSS
- Component library chosen by the UI implementation owner

### Backend
- NestJS
- TypeScript
- REST API
- WebSocket gateway for real-time events

### Data
- PostgreSQL
- Redis
- S3-compatible object storage
- PostgreSQL full-text search initially
- pgvector for semantic search/AI

### Async
- BullMQ or equivalent Redis-backed queue

### Infrastructure
- Docker
- Docker Compose for local development
- CI/CD using the team's selected provider
- Reverse proxy/load balancer in production

### Testing
- Jest
- Supertest
- Playwright
- Testcontainers where practical

## 5. Initial repository shape

```text
modern-bug-tracker/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── contracts/
│   ├── config/
│   └── shared/
├── infra/
│   ├── docker/
│   └── migrations/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── AI_FEATURE_SPECIFICATION.md
│   ├── IMPLEMENTATION_PHASES.md
│   └── ENGINEERING_STANDARDS.md
└── README.md
```

## 6. Product identity

Working name: **ForgeTrack**

The name is a placeholder and can be changed without changing the architecture.

Core promise:

> Track every engineering problem from discovery to resolution, connect it to code and releases, automate repetitive work, and use AI to make the information easier to understand without taking control away from engineers.

## 7. MVP boundary

MVP must include:
- organizations
- projects
- teams
- members and RBAC
- issues
- comments
- labels
- components
- versions/releases
- issue relationships
- attachments
- workflows
- notifications
- saved filters
- audit logs
- search
- REST API
- API tokens
- basic dashboard
- import/export
- rate limiting
- tests

Post-MVP:
- AI duplicate detection
- AI summaries
- semantic search
- Git provider integration
- CI integration
- automation engine
- advanced analytics
- SLA rules
- public issue portal
- webhooks
- plugin framework
- advanced release intelligence
