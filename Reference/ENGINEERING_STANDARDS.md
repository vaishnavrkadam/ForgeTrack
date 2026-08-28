# Engineering Standards — ForgeTrack

## 1. TypeScript

Use strict TypeScript.

Rules:
- no implicit `any`
- avoid `any`
- explicit DTO schemas
- runtime validation at API boundaries
- shared API types generated or centrally defined

## 2. Backend modules

Each module:

```text
module/
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── tests/
```

Controllers are thin.

## 3. Validation

Validate:
- request body
- path parameters
- query parameters
- imported records
- webhook payloads
- integration responses

Reject unknown/unsafe fields where appropriate.

## 4. Database

Rules:
- migrations are source controlled
- no production schema changes outside migrations
- transactions for multi-step invariants
- parameterized SQL
- explicit indexes
- avoid N+1 queries

## 5. API

- explicit DTOs
- consistent envelopes
- documented status codes
- cursor pagination for large lists
- idempotency for retry-sensitive writes
- stable error codes

## 6. Security

Never:
- log passwords
- log API tokens
- log session tokens
- store plaintext API tokens
- trust client-side role claims
- construct SQL from raw search strings
- fetch arbitrary URLs without SSRF controls

## 7. Markdown rendering

Issue/comment Markdown is untrusted.

Sanitize rendered HTML.

Block:
- script
- dangerous URLs
- event handlers
- unsafe embeds

## 8. Webhooks

Outbound webhook URLs must protect against:
- private IP access
- localhost
- cloud metadata endpoints
- internal DNS rebinding
- unexpected redirects

Use an allow/deny strategy and revalidate destination after DNS resolution.

## 9. File uploads

Validate:
- authenticated uploader
- project access
- size
- MIME type
- extension
- checksum
- scan status

Never execute uploaded files.

## 10. Testing strategy

### Unit
Pure business rules.

### Integration
Database + API modules.

### E2E
Critical user journeys.

Minimum E2E flows:
1. organization creation
2. invite member
3. project creation
4. issue creation
5. issue transition
6. comment
7. attachment
8. search
9. notification
10. permission denial
11. API token access

## 11. Test data

Use factories/builders.

Do not depend on production data.

Every test should be isolated.

## 12. Git

Recommended branch model:

```text
main
feature/*
fix/*
chore/*
```

Commit examples:

```text
feat(issue): add atomic issue creation
fix(auth): prevent cross-tenant session access
test(workflow): cover invalid transitions
```

## 13. Logging

Structured fields:
- timestamp
- level
- service
- requestId
- userId where safe
- organizationId where safe
- route
- latency
- error code

Do not log sensitive request bodies.

## 14. Environment variables

Validate configuration at startup.

Example categories:
- DATABASE_URL
- REDIS_URL
- SESSION_SECRET
- STORAGE_ENDPOINT
- STORAGE_BUCKET
- STORAGE_ACCESS_KEY
- STORAGE_SECRET_KEY
- EMAIL_PROVIDER
- AI_PROVIDER
- AI_MODEL

Secrets must never be committed.

Provide `.env.example`, never `.env`.

## 15. Feature flags

Use feature flags for:
- AI
- integrations
- public portal
- automation
- semantic search

Flags should support:
- global off
- organization allowlist
- project allowlist

## 16. Dependency policy

Prefer stable maintained packages.

Before adding a dependency:
- check maintenance
- check license
- check security history
- verify whether native platform functionality is sufficient

## 17. API documentation

Generate OpenAPI from DTO/schema definitions where possible.

The API specification document remains the product contract; generated OpenAPI is the implementation artifact.

## 18. Backward compatibility

Do not break:
- API response fields
- event types
- webhook contracts

without versioning/migration.

## 19. Error handling

Expected errors should become typed/domain errors and mapped to API error codes.

Unexpected errors:
- log with request ID
- return generic 500
- never expose internals

## 20. Performance

Before optimization:
1. measure
2. inspect query plan
3. identify bottleneck
4. optimize
5. benchmark again

Do not introduce caching merely because it sounds faster.

## 21. Accessibility

Frontend must:
- support keyboard use
- provide accessible labels
- preserve focus
- support reduced motion
- expose errors clearly
- avoid color-only status meaning

## 22. Documentation discipline

When behavior changes:
- update PRD if product behavior changed
- update architecture if boundary changed
- update schema if data changed
- update API specification if contract changed
- update implementation phase status
