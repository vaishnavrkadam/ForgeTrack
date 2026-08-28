# System Architecture — ForgeTrack

## 1. Architectural style

Use a **modular monolith first**, with explicit domain modules and asynchronous workers.

Do not start with dozens of microservices. The boundaries must be clean enough that high-load modules can later be extracted.

```text
                    ┌──────────────────────┐
                    │       Browser        │
                    │    Next.js Web App   │
                    └──────────┬───────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │   API / WebSocket     │
                    │       NestJS          │
                    └──────────┬────────────┘
                               │
        ┌──────────────────────┼─────────────────────────┐
        │                      │                         │
        ▼                      ▼                         ▼
 PostgreSQL                  Redis                 Object Storage
        │                      │                         │
        │                 Queue/Cache                    │
        │                      │                         │
        └──────────────┬───────┴──────────────┬──────────┘
                       ▼                      ▼
                 Worker Processes        Search/AI Jobs
```

## 2. Logical modules

### Identity module
Responsibilities:
- registration
- login
- sessions
- OAuth
- password reset
- API tokens
- MFA-ready architecture

### Organization module
- organizations
- members
- organization roles
- invitations
- policies

### Project module
- projects
- teams
- components
- versions
- milestones
- project settings

### Issue module
- issue CRUD
- issue keys
- issue fields
- transitions
- relationships
- watchers

### Workflow module
- statuses
- transitions
- transition rules
- validators
- post-actions

### Comment module
- comments
- mentions
- reactions
- edit history

### Attachment module
- upload sessions
- object storage
- signed URLs
- scanning hooks

### Search module
- structured filtering
- full-text search
- saved searches
- indexing

### Notification module
- preferences
- in-app notifications
- email jobs
- event subscriptions

### Automation module
- rules
- triggers
- conditions
- actions
- execution history

### Integration module
- Git providers
- webhooks
- CI
- external identity providers

### Analytics module
- project metrics
- release metrics
- time-series aggregates
- dashboard queries

### AI module
- embeddings
- duplicate candidates
- summarization
- classification
- retrieval
- AI audit records

### Audit module
- immutable event history
- compliance/security queries

## 3. Layering

Each backend module follows:

```text
Controller
   ↓
Application Service
   ↓
Domain Service / Policy
   ↓
Repository
   ↓
Database
```

External systems are adapters:

```text
Domain/Application
      ↓
Interface
      ↓
Adapter
      ↓
GitHub / Email / AI Provider / Storage
```

Controllers must not contain business rules.

## 4. Transaction rules

A transaction should contain the minimum set of changes that must be atomic.

Example issue transition:

```text
BEGIN
  validate actor permission
  validate current status
  validate target transition
  update issue
  insert issue history
  insert audit event
  insert outbox event
COMMIT
```

Notifications, embeddings, analytics and integrations should generally happen asynchronously from the outbox event.

## 5. Transactional outbox

Use an `outbox_events` table.

When a mutation produces an external event:

```text
Issue DB mutation
      +
Outbox row
      ↓
same PostgreSQL transaction
      ↓
worker polls/claims event
      ↓
publishes domain event
      ↓
jobs execute
```

This prevents losing events after a successful database mutation.

## 6. Idempotency

Mutating API requests that may be retried should accept an idempotency key.

Store:
- organization
- actor
- endpoint
- idempotency key
- request hash
- response
- status

If the same key is reused with a different request body, return an error.

## 7. Authentication

Preferred model:
- short-lived access session/token
- secure refresh mechanism
- rotating refresh tokens if JWT is used
- server-side revocation

API tokens:
- generated once
- only a hash is stored
- scoped
- revocable
- expiration optional/configurable
- shown only once

## 8. Authorization

Use RBAC plus resource policies.

Example:

```text
Organization Owner
Organization Admin
Project Admin
Maintainer
Developer
Reporter
Viewer
Guest
```

Do not assume role alone is sufficient. Every resource access checks:
1. authenticated actor
2. organization membership
3. project membership/access
4. action permission
5. resource visibility

## 9. Multi-tenancy

Every major tenant-owned table contains `organization_id`.

Never trust an ID supplied by the client.

Every query should be scoped:

```sql
WHERE organization_id = :currentOrganizationId
```

Project resources additionally require project scope.

## 10. Real-time events

WebSocket topics:
- organization
- project
- issue

Example:

```text
issue.updated
issue.comment.created
issue.status.changed
issue.assignee.changed
notification.created
```

Clients must treat WebSocket events as hints and refetch authoritative state when needed.

## 11. Search architecture

Phase 1:
- PostgreSQL indexes
- PostgreSQL full-text search

Phase 2:
- pgvector embeddings
- semantic candidate retrieval

Search pipeline:

```text
Query
 ↓
Parser
 ↓
Structured filters
 ↓
FTS / vector retrieval
 ↓
permission filter
 ↓
ranking
 ↓
results
```

Permissions must be applied before returning results.

## 12. AI architecture

```text
Issue/Event
   ↓
AI Job
   ↓
Preprocessor
   ↓
Permission-aware retrieval
   ↓
Model provider
   ↓
Validator
   ↓
Suggestion record
   ↓
User review
```

The AI service must not be able to directly bypass domain services.

## 13. Storage architecture

Object storage keys:

```text
org/{orgId}/projects/{projectId}/issues/{issueId}/{attachmentId}
```

Use opaque generated object names.

Never use user filenames as storage keys.

## 14. Background jobs

Job classes:
- notifications
- email delivery
- search indexing
- embedding generation
- AI summaries
- duplicate detection
- analytics aggregation
- webhook delivery
- imports
- exports
- cleanup

Each job:
- has a unique job identity
- is retryable where safe
- records attempts
- has dead-letter/failure handling
- is idempotent

## 15. Rate limits

Separate limits:
- authentication
- normal API
- search
- issue creation
- attachment upload
- AI endpoints
- public endpoints
- webhook delivery

Return HTTP 429 with retry metadata.

## 16. Observability

Every request receives:
- request ID
- correlation ID

Logs should be structured JSON.

Metrics:
- request latency
- error rate
- database latency
- queue depth
- job failures
- search latency
- AI latency/cost
- webhook failures
- authentication failures

Tracing should be OpenTelemetry-compatible.

## 17. Security boundaries

Treat as untrusted:
- browser input
- imported files
- webhooks
- uploaded files
- external integration payloads
- AI output
- Markdown content

Validate all of them.

## 18. Failure handling

If email fails:
- issue mutation still succeeds
- notification job retries

If AI fails:
- issue creation still succeeds
- AI suggestion is unavailable

If search indexing fails:
- database remains authoritative
- retry indexing

If Git provider is unavailable:
- integration job retries
- core issue functionality remains available

## 19. Deployment topology

Minimum production topology:

```text
Internet
  ↓
CDN/WAF
  ↓
Load Balancer
  ↓
Web instances ───── API instances
                         │
              ┌──────────┴─────────┐
              ▼                    ▼
          PostgreSQL              Redis
              │
              ▼
        Object Storage
              │
              ▼
           Workers
```

## 20. Backups

PostgreSQL:
- daily full backup
- continuous/WAL strategy where supported
- tested restoration

Object storage:
- versioning if available
- lifecycle policy
- backup strategy

Redis:
- treated as rebuildable unless a specific feature requires persistence

## 21. Migration strategy

Use forward-only versioned migrations.

Never modify an already-applied production migration.

For large migrations:
1. add nullable/new structure
2. deploy compatible code
3. backfill
4. validate
5. enforce constraint
6. remove old structure later

## 22. API versioning

Base path:

```text
/api/v1
```

Breaking changes require a new major API version.

## 23. Caching

Cache:
- project settings
- workflow configuration
- labels
- permissions where safe

Never cache mutable authorization decisions longer than policy permits.

Cache invalidation must follow mutation events.

## 24. Scaling path

### Stage 1
One API deployment + worker + PostgreSQL + Redis.

### Stage 2
Horizontal API scaling.

### Stage 3
Dedicated worker pools.

### Stage 4
Dedicated search/analytics infrastructure if PostgreSQL is insufficient.

### Stage 5
Extract AI/integration/search services only when justified by load or ownership boundaries.
