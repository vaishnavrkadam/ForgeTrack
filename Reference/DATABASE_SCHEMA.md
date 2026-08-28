# Database Schema — ForgeTrack

## 1. Database

PostgreSQL 16+ recommended.

Extensions:
- `pgcrypto` for UUID generation where desired
- `citext` where case-insensitive identifiers are required
- `pg_trgm` for fuzzy text matching
- `vector`/pgvector for semantic search in the AI phase

All timestamps are UTC and stored as `timestamptz`.

Use UUID primary keys.

## 2. Common conventions

Every tenant-owned table should include:
- `id uuid primary key`
- `organization_id uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Soft deletion should be used only where recovery/audit requirements justify it. Do not blindly add `deleted_at` to every table.

## 3. organizations

```sql
organizations (
  id uuid PK,
  slug citext UNIQUE NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  avatar_url text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

## 4. users

```sql
users (
  id uuid PK,
  email citext UNIQUE NOT NULL,
  display_name varchar(120) NOT NULL,
  avatar_url text,
  password_hash text,
  email_verified_at timestamptz,
  status varchar(30) NOT NULL,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

Status:
- ACTIVE
- INVITED
- SUSPENDED
- DEACTIVATED

## 5. organization_members

```sql
organization_members (
  id uuid PK,
  organization_id uuid FK,
  user_id uuid FK,
  role varchar(40) NOT NULL,
  status varchar(30) NOT NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, user_id)
)
```

Roles:
- OWNER
- ADMIN
- MEMBER
- GUEST

## 6. organization_invitations

```sql
organization_invitations (
  id uuid PK,
  organization_id uuid FK,
  email citext NOT NULL,
  role varchar(40) NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  invited_by uuid FK users(id),
  created_at timestamptz NOT NULL
)
```

## 7. projects

```sql
projects (
  id uuid PK,
  organization_id uuid FK,
  key varchar(20) NOT NULL,
  name varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  description text,
  visibility varchar(30) NOT NULL DEFAULT 'PRIVATE',
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  issue_counter bigint NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}',
  created_by uuid FK users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, key),
  UNIQUE (organization_id, slug)
)
```

Issue key example: `BUG-1042`.

Issue number allocation must be atomic.

## 8. project_members

```sql
project_members (
  id uuid PK,
  project_id uuid FK,
  user_id uuid FK,
  role varchar(40) NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, user_id)
)
```

## 9. teams

```sql
teams (
  id uuid PK,
  organization_id uuid FK,
  name varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  description text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, slug)
)
```

## 10. team_members

```sql
team_members (
  id uuid PK,
  team_id uuid FK,
  user_id uuid FK,
  created_at timestamptz NOT NULL,
  UNIQUE (team_id, user_id)
)
```

## 11. project_teams

```sql
project_teams (
  project_id uuid FK,
  team_id uuid FK,
  PRIMARY KEY (project_id, team_id)
)
```

## 12. issue_types

Project-configurable.

```sql
issue_types (
  id uuid PK,
  project_id uuid FK,
  name varchar(60) NOT NULL,
  code varchar(30) NOT NULL,
  icon varchar(80),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, code)
)
```

Seed defaults: BUG, FEATURE, TASK, IMPROVEMENT, INCIDENT, EPIC, QUESTION.

## 13. priorities

```sql
priorities (
  id uuid PK,
  project_id uuid FK,
  name varchar(60) NOT NULL,
  code varchar(30) NOT NULL,
  rank integer NOT NULL,
  UNIQUE (project_id, code),
  UNIQUE (project_id, rank)
)
```

## 14. severities

```sql
severities (
  id uuid PK,
  project_id uuid FK,
  name varchar(60) NOT NULL,
  code varchar(30) NOT NULL,
  rank integer NOT NULL,
  UNIQUE (project_id, code),
  UNIQUE (project_id, rank)
)
```

## 15. statuses

```sql
statuses (
  id uuid PK,
  project_id uuid FK,
  name varchar(60) NOT NULL,
  code varchar(40) NOT NULL,
  category varchar(30) NOT NULL,
  rank integer NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, code)
)
```

Categories:
- TODO
- ACTIVE
- BLOCKED
- DONE
- CANCELLED

## 16. workflow_transitions

```sql
workflow_transitions (
  id uuid PK,
  project_id uuid FK,
  from_status_id uuid FK,
  to_status_id uuid FK,
  name varchar(100) NOT NULL,
  requires_comment boolean NOT NULL DEFAULT false,
  requires_assignee boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, from_status_id, to_status_id)
)
```

## 17. components

```sql
components (
  id uuid PK,
  project_id uuid FK,
  name varchar(120) NOT NULL,
  description text,
  lead_user_id uuid FK,
  default_assignee_id uuid FK,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (project_id, name)
)
```

## 18. versions

```sql
versions (
  id uuid PK,
  project_id uuid FK,
  name varchar(120) NOT NULL,
  description text,
  status varchar(30) NOT NULL,
  start_date date,
  release_date date,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (project_id, name)
)
```

## 19. milestones

```sql
milestones (
  id uuid PK,
  project_id uuid FK,
  name varchar(120) NOT NULL,
  description text,
  due_date date,
  status varchar(30) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (project_id, name)
)
```

## 20. issues

```sql
issues (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  number bigint NOT NULL,
  issue_type_id uuid FK,
  status_id uuid FK,
  priority_id uuid FK,
  severity_id uuid FK,
  component_id uuid FK,
  version_id uuid FK,
  milestone_id uuid FK,
  reporter_id uuid FK,
  assignee_id uuid FK,
  title varchar(500) NOT NULL,
  description text,
  reproduction_steps text,
  expected_result text,
  actual_result text,
  environment jsonb,
  acceptance_criteria text,
  estimate_minutes integer,
  time_spent_minutes integer NOT NULL DEFAULT 0,
  due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  search_vector tsvector,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (project_id, number)
)
```

## 21. labels

```sql
labels (
  id uuid PK,
  project_id uuid FK,
  name varchar(80) NOT NULL,
  description text,
  created_at timestamptz NOT NULL,
  UNIQUE (project_id, name)
)
```

## 22. issue_labels

```sql
issue_labels (
  issue_id uuid FK,
  label_id uuid FK,
  PRIMARY KEY (issue_id, label_id)
)
```

## 23. issue_relationships

```sql
issue_relationships (
  id uuid PK,
  organization_id uuid FK,
  source_issue_id uuid FK,
  target_issue_id uuid FK,
  relationship_type varchar(40) NOT NULL,
  created_by uuid FK,
  created_at timestamptz NOT NULL,
  UNIQUE (source_issue_id, target_issue_id, relationship_type)
)
```

Prevent self-links unless explicitly supported for a future use case.

## 24. comments

```sql
comments (
  id uuid PK,
  organization_id uuid FK,
  issue_id uuid FK,
  author_id uuid FK,
  body text NOT NULL,
  visibility varchar(30) NOT NULL DEFAULT 'PUBLIC',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
)
```

## 25. comment_revisions

```sql
comment_revisions (
  id uuid PK,
  comment_id uuid FK,
  editor_id uuid FK,
  previous_body text NOT NULL,
  created_at timestamptz NOT NULL
)
```

## 26. mentions

```sql
mentions (
  id uuid PK,
  comment_id uuid FK,
  mentioned_user_id uuid FK,
  created_at timestamptz NOT NULL,
  UNIQUE (comment_id, mentioned_user_id)
)
```

## 27. watchers

```sql
issue_watchers (
  issue_id uuid FK,
  user_id uuid FK,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (issue_id, user_id)
)
```

## 28. attachments

```sql
attachments (
  id uuid PK,
  organization_id uuid FK,
  issue_id uuid FK,
  comment_id uuid FK,
  uploaded_by uuid FK,
  original_filename varchar(255) NOT NULL,
  object_key text NOT NULL UNIQUE,
  mime_type varchar(255),
  byte_size bigint NOT NULL,
  checksum_sha256 char(64),
  scan_status varchar(30) NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL
)
```

Exactly one of `issue_id` or `comment_id` should be populated.

## 29. custom_fields

```sql
custom_fields (
  id uuid PK,
  project_id uuid FK,
  name varchar(120) NOT NULL,
  key varchar(80) NOT NULL,
  field_type varchar(40) NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (project_id, key)
)
```

Field types:
- TEXT
- LONG_TEXT
- INTEGER
- DECIMAL
- BOOLEAN
- DATE
- DATETIME
- SELECT
- MULTI_SELECT
- USER
- URL

## 30. issue_custom_values

Prefer typed columns over a single text column.

```sql
issue_custom_values (
  id uuid PK,
  issue_id uuid FK,
  custom_field_id uuid FK,
  text_value text,
  number_value numeric,
  boolean_value boolean,
  date_value date,
  datetime_value timestamptz,
  json_value jsonb,
  UNIQUE (issue_id, custom_field_id)
)
```

Application validation ensures exactly the appropriate value representation is used for each field type.

## 31. saved_searches

```sql
saved_searches (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  owner_id uuid FK,
  name varchar(160) NOT NULL,
  visibility varchar(30) NOT NULL,
  query jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

Store parsed structured query JSON, not only the raw string.

## 32. dashboards

```sql
dashboards (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  owner_id uuid FK,
  name varchar(160) NOT NULL,
  visibility varchar(30) NOT NULL,
  layout jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

## 33. notifications

```sql
notifications (
  id uuid PK,
  organization_id uuid FK,
  user_id uuid FK,
  type varchar(80) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  entity_type varchar(50),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL
)
```

## 34. notification_preferences

```sql
notification_preferences (
  id uuid PK,
  organization_id uuid FK,
  user_id uuid FK,
  event_type varchar(80) NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, user_id, event_type)
)
```

## 35. audit_events

```sql
audit_events (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  actor_user_id uuid FK,
  entity_type varchar(60) NOT NULL,
  entity_id uuid,
  action varchar(80) NOT NULL,
  before_json jsonb,
  after_json jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  request_id varchar(100),
  created_at timestamptz NOT NULL
)
```

Create append-only database/application controls.

## 36. issue_history

```sql
issue_history (
  id uuid PK,
  organization_id uuid FK,
  issue_id uuid FK,
  actor_user_id uuid FK,
  field_name varchar(80),
  old_value jsonb,
  new_value jsonb,
  change_type varchar(40) NOT NULL,
  created_at timestamptz NOT NULL
)
```

Use for user-friendly history timelines.

## 37. outbox_events

```sql
outbox_events (
  id uuid PK,
  organization_id uuid FK,
  event_type varchar(100) NOT NULL,
  aggregate_type varchar(60) NOT NULL,
  aggregate_id uuid,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text
)
```

Index unpublished events.

## 38. automation_rules

```sql
automation_rules (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  name varchar(160) NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  trigger_type varchar(80) NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  created_by uuid FK,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

## 39. automation_executions

```sql
automation_executions (
  id uuid PK,
  rule_id uuid FK,
  event_id uuid FK,
  status varchar(30) NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  result jsonb,
  error text
)
```

## 40. api_tokens

```sql
api_tokens (
  id uuid PK,
  organization_id uuid FK,
  user_id uuid FK,
  name varchar(120) NOT NULL,
  token_prefix varchar(20) NOT NULL,
  token_hash char(64) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]',
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL
)
```

Store only a cryptographic hash of the token.

## 41. sessions

```sql
sessions (
  id uuid PK,
  user_id uuid FK,
  token_hash char(64) UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL
)
```

## 42. integrations

```sql
integrations (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  provider varchar(50) NOT NULL,
  status varchar(30) NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}',
  secret_reference text,
  created_by uuid FK,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

Secrets should live in a secret manager where available.

## 43. repositories

```sql
repositories (
  id uuid PK,
  integration_id uuid FK,
  external_id varchar(255),
  owner varchar(255),
  name varchar(255),
  default_branch varchar(255),
  web_url text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

## 44. code_links

```sql
code_links (
  id uuid PK,
  issue_id uuid FK,
  repository_id uuid FK,
  external_type varchar(40) NOT NULL,
  external_id varchar(255) NOT NULL,
  title varchar(500),
  url text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL
)
```

## 45. ai_suggestions

```sql
ai_suggestions (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  issue_id uuid FK,
  type varchar(60) NOT NULL,
  model varchar(160),
  input_hash char(64),
  result jsonb NOT NULL,
  confidence numeric(5,4),
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL
)
```

Statuses:
- PENDING
- ACCEPTED
- REJECTED
- EXPIRED

## 46. embeddings

```sql
embeddings (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  entity_type varchar(60) NOT NULL,
  entity_id uuid NOT NULL,
  content_hash char(64) NOT NULL,
  model varchar(160) NOT NULL,
  vector vector,
  created_at timestamptz NOT NULL,
  UNIQUE (entity_type, entity_id, model)
)
```

Dimension is provider/model-specific and should be configured through migration rather than guessed.

## 47. webhooks

```sql
webhooks (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  url text NOT NULL,
  secret_reference text NOT NULL,
  events jsonb NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid FK,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
```

## 48. webhook_deliveries

```sql
webhook_deliveries (
  id uuid PK,
  webhook_id uuid FK,
  event_id uuid FK,
  attempt_count integer NOT NULL DEFAULT 0,
  status varchar(30) NOT NULL,
  response_status integer,
  response_body text,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL,
  delivered_at timestamptz
)
```

## 49. Import jobs

```sql
import_jobs (
  id uuid PK,
  organization_id uuid FK,
  project_id uuid FK,
  created_by uuid FK,
  source_type varchar(40) NOT NULL,
  status varchar(30) NOT NULL,
  source_object_key text,
  total_records integer,
  successful_records integer,
  failed_records integer,
  error_report_object_key text,
  created_at timestamptz NOT NULL,
  started_at timestamptz,
  finished_at timestamptz
)
```

## 50. Important indexes

Create indexes for:
- organization membership lookup
- project membership lookup
- issue `(project_id, number)`
- issue `(project_id, status_id)`
- issue `(project_id, assignee_id)`
- issue `(project_id, priority_id)`
- issue `(project_id, created_at desc)`
- issue `(project_id, updated_at desc)`
- issue full-text search vector
- comments `(issue_id, created_at)`
- audit `(organization_id, created_at desc)`
- notifications `(user_id, read_at, created_at desc)`
- outbox `(published_at, occurred_at)`
- webhook deliveries `(status, next_attempt_at)`
- issue relationships both source and target
- embeddings vector index when enabled

## 51. Referential integrity

Use foreign keys.

For historical data:
- do not cascade-delete issues merely because a user leaves.
- preserve reporter/actor references when possible.
- user deactivation must not destroy issue history.

## 52. Issue number allocation

Use row-level locking:

```text
BEGIN
SELECT issue_counter FROM projects WHERE id = ? FOR UPDATE
UPDATE projects SET issue_counter = issue_counter + 1
INSERT issue(number = old_counter + 1)
COMMIT
```

Never calculate the next issue number with `MAX(number) + 1`.
