# Implementation Phases — ForgeTrack

## 0. How Coding Agent should use this plan

Implement sequentially.

Rules:
1. Read all specification documents before changing code.
2. Do not skip database constraints.
3. Do not build UI-specific business logic in the frontend.
4. After each phase, run tests and type checks.
5. Do not start the next phase with failing tests from the previous phase.
6. Update documentation when implementation decisions differ from these specs.
7. Prefer small commits with one logical purpose.
8. Never hard-code secrets.
9. Never weaken authorization to make a test pass.

## Phase 1 — Repository foundation

### Deliver
- monorepo
- web app
- API app
- shared package
- configuration package
- Docker Compose
- PostgreSQL
- Redis
- environment validation
- linting
- formatting
- TypeScript strict mode
- CI skeleton

### Acceptance
- fresh clone can install
- local services start
- API health endpoint works
- web app starts
- CI executes lint/type/test commands

## Phase 2 — Database and migrations

### Deliver
Implement all MVP tables from `DATABASE_SCHEMA.md`.

### Requirements
- migrations
- foreign keys
- unique constraints
- indexes
- seed data
- default workflows
- transaction helpers

### Tests
- migration from empty DB
- rollback where supported
- seed correctness
- constraint tests

## Phase 3 — Authentication and identity

### Deliver
- registration
- login
- logout
- session management
- email verification architecture
- password reset architecture
- API token authentication
- organization membership
- invitations

### Security
- Argon2id
- secure cookies/session handling
- brute-force rate limiting
- token hashing
- session revocation

### Acceptance
Unauthorized users cannot access tenant resources.

## Phase 4 — RBAC and authorization

### Deliver
- organization roles
- project roles
- permission matrix
- resource guards/policies

Create centralized authorization services.

### Tests
For each critical endpoint:
- allowed role
- denied role
- wrong organization
- wrong project
- deactivated user

## Phase 5 — Project configuration

### Deliver
- projects
- teams
- members
- components
- labels
- versions
- milestones
- issue types
- priorities
- severities
- statuses

### Acceptance
Admin can fully configure a project.

## Phase 6 — Issue engine

### Deliver
- atomic issue numbering
- create/read/update/archive
- issue keys
- assignment
- labels
- custom fields
- due dates
- estimates
- environment fields

### Critical tests
- concurrent issue creation never duplicates numbers
- cross-project issue access fails
- invalid custom fields fail validation

## Phase 7 — Workflow engine

### Deliver
- statuses
- transitions
- transition conditions
- transition validation
- history
- audit events

### Acceptance
Users cannot bypass workflow rules by calling the API directly.

## Phase 8 — Comments and collaboration

### Deliver
- comments
- mentions
- private comments
- revisions
- watchers
- reactions if desired

### Background
Mentions create notifications asynchronously.

## Phase 9 — Attachments

### Deliver
- upload sessions
- object storage adapter
- signed downloads
- metadata
- file size validation
- MIME validation
- scanning hook
- attachment permissions

Never trust filename extension alone.

## Phase 10 — Search

### Deliver
- exact filters
- issue key search
- full-text search
- query parser
- structured query AST
- saved searches

### Query safety
No SQL string concatenation.

### Tests
- parser unit tests
- authorization filtering tests
- search ranking tests
- malformed query tests

## Phase 11 — Notifications

### Deliver
- notification events
- in-app notifications
- preferences
- email queue
- retries
- notification deduplication

## Phase 12 — Dashboards and analytics

### Deliver
- overview metrics
- issue counts
- resolution time
- trend queries
- release progress
- saved dashboard configuration

Optimize expensive analytics queries and use aggregates where required.

## Phase 13 — Audit and administration

### Deliver
- audit timeline
- organization audit search
- security events
- administrative views

Audit records must not be editable through normal application APIs.

## Phase 14 — Automation engine

### Deliver
- rules
- triggers
- conditions
- actions
- execution records
- retries
- idempotency
- rule test/dry-run endpoint

Start with safe actions.

## Phase 15 — Git integrations

### Deliver
Provider interface:

```text
GitProvider
├── validateConnection
├── listRepositories
├── getPullRequest
├── getCommit
├── listBranches
└── webhookEventParser
```

Implement one provider first, then additional providers through adapters.

### Deliver
- repository connection
- webhook ingestion
- issue-key extraction
- commit links
- PR links

## Phase 16 — CI/release intelligence

### Deliver
- CI run entities
- build status links
- release health
- issue-to-release mapping
- failed-build correlation

## Phase 17 — AI duplicate detection

### Deliver
- embedding generation
- pgvector
- similarity search
- candidate ranking
- suggestion records
- accept/reject feedback
- feature flags
- quotas

No automatic duplicate mutation.

## Phase 18 — AI issue quality and triage

### Deliver
- quality assistant
- classification suggestions
- confidence scores
- explanation
- feedback

## Phase 19 — AI summaries and semantic search

### Deliver
- issue summaries
- natural-language search
- permission-aware retrieval
- caching
- prompt/version tracking

## Phase 20 — Import/export

### Deliver
- CSV import
- CSV export
- JSON export
- Bugzilla-compatible import where practical
- async job progress
- validation/error reports

## Phase 21 — Webhooks and external API maturity

### Deliver
- outbound webhooks
- HMAC signatures
- retries
- delivery history
- API documentation generation
- rate limit headers
- idempotency

## Phase 22 — Hardening

### Security tests
- authorization matrix
- IDOR tests
- SQL injection tests
- XSS tests
- CSRF tests
- SSRF tests for webhook/integration URLs
- upload abuse
- rate-limit tests
- secret leakage scans

### Reliability
- retry tests
- queue failure tests
- database outage behavior
- object storage outage behavior

## Phase 23 — Performance

Benchmark:
- issue list
- issue search
- issue creation
- comments
- dashboard
- notifications

Add indexes only based on measured query plans.

## Phase 24 — Production readiness

Deliver:
- Docker production build
- environment documentation
- health/readiness probes
- metrics
- structured logging
- tracing
- backups
- restore procedure
- migration procedure
- incident runbook

## Phase 25 — UI integration

The UI owner supplies visual design.

Frontend must:
- use API contracts
- use typed API clients
- respect loading/error/empty states
- support real-time updates
- never duplicate authorization logic as the source of truth
- provide accessible interactions

## Definition of Done

A feature is done only when:
- implementation exists
- API contract exists
- database migration exists if needed
- authorization is implemented
- validation exists
- unit tests exist
- integration tests exist for critical paths
- audit behavior is defined
- async behavior is tested
- error states are handled
- documentation is updated
- lint/typecheck/tests pass
