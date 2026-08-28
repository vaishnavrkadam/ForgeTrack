# Product Requirements Document — ForgeTrack

## 1. Product vision

ForgeTrack is a modern engineering issue-tracking platform inspired by the depth of Bugzilla and the usability patterns of modern developer tools.

It should support organizations that need rigorous defect management while also supporting feature planning, release management, engineering workflows, automation, integrations and AI-assisted triage.

The platform must remain useful without AI. AI is an augmentation layer, not the foundation.

## 2. Goals

### Primary goals
1. Track bugs, tasks, features and engineering work reliably.
2. Support configurable project workflows.
3. Make issue creation and triage fast.
4. Provide powerful filtering and search.
5. Maintain a complete audit trail.
6. Connect issues to releases, commits, branches, pull requests and CI runs.
7. Reduce duplicate issue creation.
8. Provide useful engineering analytics.
9. Support organization-level and project-level permissions.
10. Provide a stable REST API and webhook/event model.

### Secondary goals
- Import data from Bugzilla/Jira/CSV.
- Export organization/project data.
- Support public/private projects.
- Provide SLA and escalation capabilities.
- Provide extensibility through integrations and future plugins.

## 3. Non-goals

For the first release, do not build:
- a full source-control system
- a full CI/CD platform
- a full documentation/wiki platform
- a complete chat application
- a general-purpose CRM
- autonomous AI that closes/reassigns issues without explicit configured authorization
- billing/subscription infrastructure unless specifically requested

## 4. Personas

### Reporter
Creates issues and follows their status.

Needs:
- simple issue creation
- attachments
- templates
- duplicate suggestions
- notification control

### Developer
Investigates and resolves issues.

Needs:
- technical issue details
- comments
- code links
- related issues
- assignment
- history
- keyboard shortcuts
- automation

### QA Engineer
Finds, reproduces and verifies defects.

Needs:
- reproduction steps
- expected/actual behavior
- environment information
- severity
- regression tracking
- verification status

### Project Manager
Coordinates work and releases.

Needs:
- backlog
- milestones
- versions
- dashboards
- workload
- reports
- dependencies

### Project Administrator
Configures a project.

Needs:
- workflows
- custom fields
- components
- permissions
- automation
- integrations

### Organization Administrator
Controls the entire tenant.

Needs:
- members
- roles
- security
- projects
- organization policies
- audit logs
- API access

## 5. Core domain concepts

### Organization
Top-level tenant.

### Project
A product/system being managed.

### Team
A group of users associated with projects.

### Issue
The central work item.

Issue types:
- BUG
- FEATURE
- TASK
- IMPROVEMENT
- INCIDENT
- EPIC
- QUESTION

### Component
A logical area of the product.

### Version
A planned or released software version.

### Milestone
A project target independent of software version.

### Workflow
Defines valid status transitions.

### Label
Free-form classification.

### Custom field
Project-defined structured metadata.

### Relationship
A directional or semantic connection between issues.

Supported relationship types:
- blocks
- blocked_by
- duplicates
- duplicated_by
- relates_to
- depends_on
- depended_on_by
- parent_of
- child_of
- caused_by
- causes

## 6. Issue lifecycle

Default workflow:

```text
OPEN
  ↓
TRIAGED
  ↓
IN_PROGRESS
  ↓
IN_REVIEW
  ↓
RESOLVED
  ↓
VERIFIED
  ↓
CLOSED
```

Alternative transitions:
- OPEN → REJECTED
- TRIAGED → DUPLICATE
- IN_PROGRESS → BLOCKED
- BLOCKED → IN_PROGRESS
- RESOLVED → REOPENED
- VERIFIED → REOPENED
- CLOSED → REOPENED

Projects can configure workflows, but:
- every transition must be validated
- terminal states must be explicitly marked
- permissions must be checked
- transitions must be audited

## 7. Issue fields

Required:
- project
- issue number
- title
- issue type
- status
- priority
- reporter
- created timestamp
- updated timestamp

Recommended:
- description
- assignee
- severity
- component
- version
- milestone
- labels
- due date
- environment
- reproduction steps
- expected result
- actual result
- acceptance criteria
- estimate
- time spent

## 8. Issue creation

Users can:
1. Create from project.
2. Create from global command action.
3. Create from API.
4. Create from email/webhook integration in future.
5. Duplicate an existing issue.

Issue templates may prefill:
- title prefix
- issue type
- component
- labels
- description sections
- custom fields

## 9. Triage

Triage view must allow:
- bulk assignment
- bulk priority
- bulk labels
- bulk component
- bulk status transition
- duplicate linking
- template application
- AI suggestions
- filtering by age, severity and source

Bulk operations must:
- validate every issue
- report per-item failures
- create audit entries
- avoid partial silent success

## 10. Comments

Comments support:
- plain text
- Markdown
- mentions
- issue references
- attachments
- internal/private comments
- edit history
- reactions

Private comments are visible only to authorized users.

## 11. Search

Search must support:
- issue key
- title
- description
- comments
- labels
- status
- priority
- assignee
- reporter
- component
- version
- dates
- custom fields

Example query language:

```text
project:PAY status:open priority:high assignee:me
```

More examples:

```text
type:bug severity:critical
status:resolved updated:30d
label:security component:auth
created:<2026-08-01
```

The parser must produce a structured query AST and parameterized database query. Never interpolate user query text into SQL.

## 12. Saved searches

Users can save searches as:
- private
- project-visible
- organization-visible

A saved search may optionally power a dashboard widget.

## 13. Notifications

Notification triggers:
- issue assigned
- mentioned
- comment added
- status changed
- priority changed
- issue reopened
- issue resolved
- watched issue updated
- milestone/version updated

Channels:
- in-app
- email
- webhook
- future provider integrations

Users control notification preferences, but security-critical organization notifications may be mandatory.

## 14. Attachments

Requirements:
- object storage
- upload metadata
- file size limits
- MIME validation
- malware scanning hook
- access checks
- signed download URLs
- attachment deletion audit

Never serve arbitrary uploaded files directly from the application domain without validation.

## 15. Dashboards

Default widgets:
- open issues
- unresolved critical issues
- recently created
- recently resolved
- overdue
- assigned to me
- issue trend
- resolution time
- severity distribution
- component health
- release health

Dashboard configuration is user-specific.

## 16. Release management

A version/release has:
- name
- description
- release date
- status
- release notes
- issues
- completion percentage

Release statuses:
- PLANNED
- IN_DEVELOPMENT
- RELEASED
- ARCHIVED

## 17. Automation engine

Rules have:

```text
WHEN event
IF conditions
THEN actions
```

Example:

```text
WHEN issue.created
IF severity == critical
THEN notify(project_admins)
AND set_priority(high)
AND add_label("urgent")
```

Actions must be permission-checked and idempotent.

Initial supported triggers:
- issue.created
- issue.updated
- issue.status_changed
- issue.assigned
- issue.commented
- issue.resolved
- issue.reopened
- version.released

Initial actions:
- set status
- assign user
- add/remove label
- set priority
- add comment
- notify users
- create webhook event

## 18. AI features

### AI duplicate detection
When an issue is created, find semantically similar issues and show ranked suggestions.

AI must never automatically mark an issue as duplicate.

### AI issue quality assistant
Identify missing:
- reproduction steps
- expected result
- actual result
- environment
- logs
- acceptance criteria

### AI summary
Summarize long issue histories.

### AI triage
Suggest:
- issue type
- severity
- priority
- component
- labels
- likely team

### Semantic search
Search natural-language concepts instead of exact keywords.

### Release risk
Estimate risk from:
- unresolved critical issues
- reopened issues
- dependency graph
- issue age
- linked code changes
- failed CI runs

All AI output is advisory and must show uncertainty/limitations where appropriate.

## 19. Git integration

Integration entities:
- provider
- repository
- branch
- commit
- pull request
- review
- build/CI run

Issue keys can be detected in commit messages and PR descriptions.

Example:

```text
Fix token refresh BUG-1042
```

The system links the commit to BUG-1042.

Supported providers should be implemented behind an adapter interface:
- GitHub
- GitLab
- Bitbucket

Do not hard-code provider-specific logic into issue services.

## 20. Public issue portal

Future capability:
- public project issue listing
- public issue submission
- CAPTCHA/rate limiting
- configurable fields
- spam moderation
- private internal metadata remains inaccessible

## 21. Security requirements

Must include:
- password hashing using Argon2id or equivalent
- secure sessions
- refresh token rotation if JWT architecture is used
- CSRF protection where applicable
- strict CORS
- rate limiting
- brute-force protection
- RBAC
- object-level authorization
- audit logs
- secure file access
- input validation
- SQL injection prevention
- XSS-safe rendering
- secret management

## 22. Auditability

Audit events must record:
- actor
- organization
- project
- entity type
- entity ID
- action
- before snapshot where appropriate
- after snapshot where appropriate
- timestamp
- IP metadata where policy allows
- request/correlation ID

Audit records should be append-only to normal application users.

## 23. Import/export

Import:
- CSV
- JSON
- Bugzilla XML/JSON where practical

Export:
- CSV
- JSON
- project archive

Imports must use asynchronous jobs and provide:
- validation report
- successful count
- failed count
- downloadable error report
- idempotency strategy

## 24. Performance targets

Initial targets:
- p95 read API < 300 ms under normal load
- p95 issue mutation < 500 ms excluding asynchronous side effects
- search p95 < 800 ms for normal queries
- UI real-time event propagation target < 2 seconds
- background jobs must expose retry and failure state

Targets are engineering goals, not guarantees.

## 25. Accessibility

Frontend must target WCAG 2.2 AA:
- keyboard navigation
- focus visibility
- semantic controls
- screen-reader labels
- adequate contrast
- reduced-motion support
- no interaction dependent solely on color

## 26. Acceptance criteria for v1

A v1 build is acceptable when:
1. A new organization can be created.
2. An admin can create a project.
3. Members can be invited and assigned roles.
4. Users can create, edit, comment on and transition issues.
5. Workflow restrictions are enforced server-side.
6. Attachments work securely.
7. Search and saved filters work.
8. Notifications work.
9. Audit history is visible to authorized users.
10. API tokens can access permitted resources.
11. Project dashboards display correct metrics.
12. Automated tests cover critical flows.
13. Database migrations work from an empty database.
14. Production deployment can be recreated from documented configuration.
15. No critical authorization bypass exists.
