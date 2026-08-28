# API Specification — ForgeTrack REST API v1

## 1. Base URL

```text
/api/v1
```

Production host is environment-specific.

## 2. Authentication

Browser:
- secure session cookie preferred.

API clients:
```http
Authorization: Bearer <token>
```

API token scopes:
- `org:read`
- `org:write`
- `project:read`
- `project:write`
- `issue:read`
- `issue:write`
- `comment:write`
- `attachment:write`
- `admin`
- `webhook:manage`
- `automation:manage`

Server must enforce scope + resource permission.

## 3. Headers

Recommended:
```http
Content-Type: application/json
Accept: application/json
X-Request-ID: <optional-client-id>
Idempotency-Key: <unique-key-for-retryable-mutations>
```

Response includes:
```http
X-Request-ID: <server-request-id>
```

## 4. Standard success envelope

Single resource:

```json
{
  "data": {},
  "meta": {}
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque",
    "hasMore": true
  }
}
```

## 5. Error envelope

```json
{
  "error": {
    "code": "ISSUE_NOT_FOUND",
    "message": "Issue was not found.",
    "details": {},
    "requestId": "req_..."
  }
}
```

Never expose stack traces in production.

## 6. Pagination

Cursor pagination:

```text
?limit=50&cursor=<opaque>
```

Default: 25.
Maximum: 100 unless endpoint explicitly documents another limit.

## 7. Filtering

Use query parameters or structured query endpoint.

Example:

```text
GET /projects/BUG/issues?status=open&priority=high
```

Complex search:

```text
POST /search/issues
{
  "query": "project:BUG status:open priority:high",
  "limit": 50
}
```

## 8. Organizations

### Create organization

```http
POST /organizations
```

Request:
```json
{
  "name": "Acme Engineering",
  "slug": "acme-engineering"
}
```

### Get organization

```http
GET /organizations/{organizationId}
```

### Update organization

```http
PATCH /organizations/{organizationId}
```

### List members

```http
GET /organizations/{organizationId}/members
```

### Invite member

```http
POST /organizations/{organizationId}/invitations
```

```json
{
  "email": "person@example.com",
  "role": "MEMBER"
}
```

### Remove member

```http
DELETE /organizations/{organizationId}/members/{userId}
```

## 9. Projects

### Create

```http
POST /organizations/{organizationId}/projects
```

```json
{
  "key": "PAY",
  "name": "Payments",
  "description": "Payment platform"
}
```

### List

```http
GET /organizations/{organizationId}/projects
```

### Get

```http
GET /projects/{projectId}
```

### Update

```http
PATCH /projects/{projectId}
```

### Archive

```http
POST /projects/{projectId}/archive
```

## 10. Project members

```http
GET /projects/{projectId}/members
POST /projects/{projectId}/members
PATCH /projects/{projectId}/members/{userId}
DELETE /projects/{projectId}/members/{userId}
```

## 11. Components

```http
GET /projects/{projectId}/components
POST /projects/{projectId}/components
GET /projects/{projectId}/components/{componentId}
PATCH /projects/{projectId}/components/{componentId}
DELETE /projects/{projectId}/components/{componentId}
```

Create:
```json
{
  "name": "Authentication",
  "description": "Login/session functionality",
  "leadUserId": "uuid"
}
```

## 12. Labels

```http
GET /projects/{projectId}/labels
POST /projects/{projectId}/labels
PATCH /projects/{projectId}/labels/{labelId}
DELETE /projects/{projectId}/labels/{labelId}
```

## 13. Versions

```http
GET /projects/{projectId}/versions
POST /projects/{projectId}/versions
GET /projects/{projectId}/versions/{versionId}
PATCH /projects/{projectId}/versions/{versionId}
POST /projects/{projectId}/versions/{versionId}/release
```

## 14. Issues

### Create issue

```http
POST /projects/{projectId}/issues
```

Example:
```json
{
  "issueTypeId": "uuid",
  "title": "Session expires while refreshing token",
  "description": "Users are redirected to login.",
  "priorityId": "uuid",
  "severityId": "uuid",
  "assigneeId": "uuid",
  "componentId": "uuid",
  "labelIds": ["uuid"],
  "customFields": {
    "browser": "Chrome"
  }
}
```

Response:
```json
{
  "data": {
    "id": "uuid",
    "key": "PAY-1042",
    "number": 1042,
    "title": "Session expires while refreshing token",
    "status": {},
    "priority": {},
    "severity": {}
  }
}
```

### Get issue

```http
GET /issues/{issueId}
```

### Get by issue key

```http
GET /issues/by-key/{projectKey}-{number}
```

### Update issue

```http
PATCH /issues/{issueId}
```

Only changed fields should be supplied.

### Delete/archive issue

Prefer archive semantics:

```http
POST /issues/{issueId}/archive
```

Hard deletion should be restricted to organization-level administrative workflows and should not be the normal user operation.

## 15. Issue transitions

### Get allowed transitions

```http
GET /issues/{issueId}/transitions
```

### Transition

```http
POST /issues/{issueId}/transitions
```

```json
{
  "transitionId": "uuid",
  "comment": "Fix merged and ready for verification."
}
```

Server checks:
- current status
- transition exists
- actor permission
- required fields
- transition conditions
- comment requirement

## 16. Comments

### List

```http
GET /issues/{issueId}/comments
```

### Create

```http
POST /issues/{issueId}/comments
```

```json
{
  "body": "I reproduced this on the staging environment.",
  "visibility": "PUBLIC"
}
```

### Update

```http
PATCH /comments/{commentId}
```

### Delete

```http
DELETE /comments/{commentId}
```

Deletion should normally be soft deletion with audit history.

## 17. Watchers

```http
GET /issues/{issueId}/watchers
POST /issues/{issueId}/watchers
DELETE /issues/{issueId}/watchers/{userId}
```

## 18. Relationships

### List

```http
GET /issues/{issueId}/relationships
```

### Create

```http
POST /issues/{issueId}/relationships
```

```json
{
  "targetIssueId": "uuid",
  "relationshipType": "BLOCKS"
}
```

### Delete

```http
DELETE /issue-relationships/{relationshipId}
```

## 19. Attachments

### Create upload session

```http
POST /issues/{issueId}/attachments
```

```json
{
  "filename": "error.log",
  "mimeType": "text/plain",
  "byteSize": 18420
}
```

Response contains a short-lived signed upload URL or multipart upload instructions.

### Complete upload

```http
POST /attachments/{attachmentId}/complete
```

### Download

```http
GET /attachments/{attachmentId}/download
```

Server returns/redirects to a short-lived signed URL after authorization.

## 20. Search

```http
POST /search/issues
```

Request:
```json
{
  "query": "project:PAY status:open label:security",
  "limit": 50,
  "cursor": null
}
```

Response includes:
- normalized query
- result count if cheap
- issues
- next cursor

## 21. Saved searches

```http
GET /projects/{projectId}/saved-searches
POST /projects/{projectId}/saved-searches
GET /saved-searches/{id}
PATCH /saved-searches/{id}
DELETE /saved-searches/{id}
```

## 22. Dashboards

```http
GET /projects/{projectId}/dashboards
POST /projects/{projectId}/dashboards
GET /dashboards/{id}
PATCH /dashboards/{id}
DELETE /dashboards/{id}
```

## 23. Notifications

```http
GET /notifications
POST /notifications/{id}/read
POST /notifications/read-all
GET /notification-preferences
PATCH /notification-preferences
```

## 24. Audit

```http
GET /organizations/{organizationId}/audit-events
GET /projects/{projectId}/audit-events
GET /issues/{issueId}/history
```

Audit visibility is permission-restricted.

## 25. Automation

```http
GET /projects/{projectId}/automation-rules
POST /projects/{projectId}/automation-rules
GET /automation-rules/{id}
PATCH /automation-rules/{id}
DELETE /automation-rules/{id}
POST /automation-rules/{id}/test
GET /automation-rules/{id}/executions
```

Example:
```json
{
  "name": "Critical issue escalation",
  "triggerType": "ISSUE_CREATED",
  "conditions": [
    {
      "field": "severity",
      "operator": "equals",
      "value": "critical"
    }
  ],
  "actions": [
    {
      "type": "NOTIFY_PROJECT_ADMINS"
    }
  ]
}
```

## 26. API tokens

```http
GET /organizations/{organizationId}/api-tokens
POST /organizations/{organizationId}/api-tokens
DELETE /api-tokens/{id}
```

Creation response returns the plaintext token exactly once.

## 27. Webhooks

```http
GET /projects/{projectId}/webhooks
POST /projects/{projectId}/webhooks
PATCH /webhooks/{id}
DELETE /webhooks/{id}
POST /webhooks/{id}/test
GET /webhooks/{id}/deliveries
POST /webhook-deliveries/{id}/retry
```

Payload:

```json
{
  "id": "event_uuid",
  "type": "issue.updated",
  "occurredAt": "2026-08-27T10:00:00Z",
  "data": {}
}
```

Sign requests with HMAC using a secret.

## 28. Git integrations

```http
GET /organizations/{organizationId}/integrations
POST /organizations/{organizationId}/integrations
PATCH /integrations/{id}
DELETE /integrations/{id}
POST /integrations/{id}/test
```

Repository endpoints:
```http
GET /integrations/{integrationId}/repositories
POST /repositories/{repositoryId}/sync
```

## 29. AI endpoints

AI endpoints must return suggestions, not silently mutate issues.

### Duplicate candidates

```http
POST /issues/{issueId}/ai/duplicates
```

Response:
```json
{
  "data": [
    {
      "issueId": "uuid",
      "issueKey": "PAY-811",
      "score": 0.87,
      "reason": "Similar authentication failure after session timeout."
    }
  ]
}
```

### Issue quality

```http
POST /issues/{issueId}/ai/quality-check
```

### Summary

```http
POST /issues/{issueId}/ai/summary
```

### Triage suggestions

```http
POST /issues/{issueId}/ai/triage
```

### Semantic search

```http
POST /search/semantic
```

All AI routes require feature flags and appropriate project/org permissions.

## 30. Analytics

```http
GET /projects/{projectId}/analytics/overview
GET /projects/{projectId}/analytics/issues
GET /projects/{projectId}/analytics/resolution-time
GET /projects/{projectId}/analytics/releases/{versionId}
```

Analytics responses should state the time window used.

## 31. Import/export

```http
POST /projects/{projectId}/imports
GET /imports/{id}
GET /imports/{id}/errors
POST /projects/{projectId}/exports
GET /exports/{id}
```

Large jobs are asynchronous.

## 32. HTTP status rules

- 200 successful read/update
- 201 successful creation
- 202 accepted asynchronous job
- 204 successful deletion/action with no body
- 400 malformed request
- 401 unauthenticated
- 403 authenticated but forbidden
- 404 resource unavailable
- 409 state/conflict
- 422 semantic validation failure
- 429 rate limited
- 500 unexpected server error

## 33. Important error codes

```text
AUTH_REQUIRED
AUTH_INVALID
PERMISSION_DENIED
RESOURCE_NOT_FOUND
VALIDATION_ERROR
PROJECT_KEY_TAKEN
ISSUE_NOT_FOUND
INVALID_TRANSITION
TRANSITION_NOT_ALLOWED
DUPLICATE_RELATIONSHIP
SELF_RELATIONSHIP
ATTACHMENT_TOO_LARGE
ATTACHMENT_BLOCKED
RATE_LIMITED
IDEMPOTENCY_CONFLICT
INTEGRATION_UNAVAILABLE
AI_DISABLED
AI_UNAVAILABLE
IMPORT_INVALID
```

## 34. API design rule

Do not expose ORM models directly.

Create explicit DTOs/schemas:
- CreateIssueRequest
- UpdateIssueRequest
- IssueResponse
- IssueSummaryResponse
- TransitionIssueRequest
- etc.

This protects the API from accidental database coupling.
