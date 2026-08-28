# ForgeTrack — Full-Stack Productionization Plan

> **Objective**: Transform ForgeTrack from a localStorage-powered demo into a real, production-grade bug tracker with genuine OAuth, real project management, true API data, and a polished UX that provides actual engineering value.

---

> [!IMPORTANT]
> **State of the codebase today**: The NestJS backend is architecturally complete and production-ready (real DB queries, sessions, RBAC, migrations). The Next.js frontend is entirely disconnected from it — every piece of data is hardcoded or in memory. The OAuth layer (GitHub/Google) does not exist on the backend. The goal of this plan is to wire everything together end-to-end.

---

## Phase 1 — Real OAuth Authentication (GitHub & Google)

### The Problem
- The backend has **email/password auth only** (`POST /auth/login`, `POST /auth/register`).
- The frontend has a **fake login** that just stores a fake object in `localStorage` — no real API calls are made.
- No GitHub OAuth or Google OAuth callback flows exist anywhere in the system.

### What Needs to Be Built

#### 1.1 Backend: `apps/api/src/auth/`

**New DB migration** to add OAuth provider columns to the `users` table:
```sql
ALTER TABLE users ADD COLUMN oauth_provider varchar(30);
ALTER TABLE users ADD COLUMN oauth_provider_id varchar(255);
ALTER TABLE users ADD COLUMN avatar_url text;
```

**New auth endpoints** in `auth.controller.ts`:
- `GET /auth/github` — Redirect user to GitHub OAuth authorization URL
- `GET /auth/github/callback` — Receive code, exchange for access token, upsert user, create session, redirect to frontend with `?sid=<token>`
- `GET /auth/google` — Redirect user to Google OAuth authorization URL
- `GET /auth/google/callback` — Same as GitHub callback flow

**New `OAuthService`** logic (`auth/oauth.service.ts`):
- `exchangeGitHubCode(code)` — Calls `https://github.com/login/oauth/access_token`, then `https://api.github.com/user` and `/user/emails` to get **real name, email, avatar**
- `exchangeGoogleCode(code)` — Calls Google's token endpoint, then `https://www.googleapis.com/oauth2/v3/userinfo` to get **real name, email, avatar**
- `upsertOAuthUser(provider, profileData)` — Find or create user by `(oauth_provider, oauth_provider_id)`, bootstrap their organization if new

**New Environment Variables** (`.env.example` update):
```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_BASE_URL=https://your-api.onrender.com
FRONTEND_URL=https://your-app.vercel.app
```

#### 1.2 Frontend: `apps/web/src/`

**Remove all fake auth** from `store.tsx`:
- Delete the mock `login()` function, delete hardcoded `UserData` fabrication

**Create `apps/web/src/lib/api.ts`** — a centralized API client:
```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // sends session cookie automatically
});
```

**Create `apps/web/src/hooks/useAuth.ts`**:
- `useAuth()` hook that calls `GET /api/v1/auth/me` on mount
- Returns `{ user, organization, isLoading, isAuthenticated }`
- Stores the real user context from the API response

**Update `AuthModal.tsx`**:
- "Continue with GitHub" button → `window.location.href = API_URL + '/auth/github'`
- "Continue with Google" button → `window.location.href = API_URL + '/auth/google'`
- Email/password form → POST to `POST /api/v1/auth/login` and `POST /api/v1/auth/register`

**Create `apps/web/src/app/auth/callback/page.tsx`**:
- Handles `?sid=<token>` query param from OAuth redirect, stores session cookie, calls `/auth/me`, redirects to workspace

**Update `TopBar.tsx` profile display**:
- Shows **real** `user.displayName` and `user.avatarUrl` (the GitHub/Google profile picture)
- Logout calls `POST /api/v1/auth/logout` then redirects to landing

---

## Phase 2 — Real Project Management (Create / Import from GitHub / Join)

### The Problem
- Projects are **3 hardcoded items** in `store.tsx` (`FORGE`, `WEB`, `AI`).
- The backend has a complete `ProjectService` and `ProjectController` — but the frontend never calls them.
- There is no "no project" empty state — the UI always shows dummy projects.

### What Needs to Be Built

#### 2.1 Backend: `apps/api/src/project/`

The backend controller is complete. What's missing:
- **GitHub Repository Import** endpoint: `POST /projects/import-from-github`
  - Accepts `{ repoOwner, repoName, accessToken }` from the authenticated user's GitHub OAuth token
  - Uses `GitHubProvider.listRepositories()` to verify access
  - Creates a new ForgeTrack Project record linked to a `repositories` row
  - Returns the newly created project with its key and ID

- **Project invitation flow**: `POST /organizations/:orgId/projects/:projectId/invite`
  - Sends an email invite to a developer by email
  - On accept, creates a `project_members` record

#### 2.2 Frontend: New Pages & Components

**Create `apps/web/src/components/onboarding/ProjectSetupScreen.tsx`**:
- Shown when user is authenticated but has **zero projects**
- Two primary call-to-action cards:

  **Option A — Create New Project**
  ```
  Project Name: [______________]
  Project Key:  [______________] (auto-suggested from name)
  Description:  [______________]
  Visibility:   [Private] [Public]
  [Create Project]
  ```

  **Option B — Import from GitHub**
  ```
  [Connect GitHub Account →]
  (after connect, shows dropdown of repositories)
  [Select repository] ▼
  [Import Repository]
  ```

  **Option C — Join Existing Project**
  ```
  (shown when user has a pending invitation in their email)
  Invitation from: team@company.com
  Project: Backend API — FORGE
  [Accept Invitation]
  ```

**Refactor `store.tsx` → `ProjectContext.tsx`**:
- On login, fetch `GET /api/v1/organizations/:orgId/projects`
- Store the array; if empty, set `viewMode = 'onboarding'`
- Expose `currentProject`, `setCurrentProject`, `projectMembers`

**Create `apps/web/src/components/onboarding/InviteMembersModal.tsx`**:
- After project creation, prompt: "Invite your team"
- Email input, role selector (`DEVELOPER`, `QA`, `LEAD`)
- Calls `POST /api/v1/organizations/:orgId/projects/:projectId/invite`
- Shows pending invitations list

#### 2.3 Guard: No Project → No Actions

**Create `ProjectGuard` HOC / hook**:
- If `currentProject === null`, disable/hide all sidebar tabs except "Create/Join Project"
- Show a full-screen overlay or empty state in the `main` content area:

  ```
  🐛 No Project Selected
  
  You haven't created or joined a project yet.
  Create a new project or import one from GitHub to get started.
  
  [+ Create Project]   [↓ Import from GitHub]
  ```
- Prevents issue creation, board navigation, AI workbench, etc.

---

## Phase 3 — Real Issues & Assignees (API-Driven)

### The Problem
- Issues are created in `localStorage` and never persisted anywhere
- The assignee dropdown in `CreateIssueModal` is a hardcoded string field (`Alex Chen`)
- The Issues List, Kanban Board, and Dashboard all read from `store.tsx` local state

### What Needs to Be Built

#### 3.1 Frontend: Data Layer

**Create `apps/web/src/lib/api/issues.ts`**:
```typescript
export const createIssue = (projectId: string, dto) => apiClient.post(`/projects/${projectId}/issues`, dto);
export const listIssues = (projectId: string, filters) => apiClient.get(`/projects/${projectId}/issues`, { params: filters });
export const updateIssue = (issueId: string, dto) => apiClient.patch(`/issues/${issueId}`, dto);
export const getIssue = (issueId: string) => apiClient.get(`/issues/${issueId}`);
```

**Create `apps/web/src/hooks/useIssues.ts`** (with React Query or SWR):
```typescript
const { data: issues, mutate } = useSWR(
  currentProject ? `/projects/${currentProject.id}/issues` : null,
  fetcher
);
```

**Refactor `IssuesListView.tsx`**:
- Instead of `issues.filter(...)`, render `issues` returned from the real API
- Server-side filtering: pass `?type=BUG&priority=URGENT&search=...` query params
- Infinite scroll or pagination support

**Refactor `KanbanBoardView.tsx`**:
- Drag-to-update status calls `PATCH /api/v1/issues/:id { status: 'IN_PROGRESS' }`
- Optimistic update with rollback on error

#### 3.2 Assignee System — Real Members

**Fix `CreateIssueModal.tsx` assignee field**:
- On mount, fetch `GET /api/v1/projects/:projectId/members`
- Render a real `<select>` or searchable dropdown listing actual team members by name and avatar
- The selected member's `user.id` is sent as `assigneeId` in the `POST /issues` body

**Fix `IssueDetailView.tsx` assignee display**:
- Show real member's profile picture and full name from the API response

#### 3.3 Dashboard — Real Stats

**Refactor `DashboardView.tsx`**:
- Stats are calculated server-side: call `GET /api/v1/projects/:projectId/stats` (new endpoint)
- Returns `{ openCount, urgentCount, inProgressCount, ciPassRate, recentIssues[] }`
- Recent activity feed shows real last-modified issues

---

## Phase 4 — Real Notification System & Emails

### The Problem
- Email invitations use `console.log()` — they're never actually sent
- No in-app notifications are wired to the frontend

### What Needs to Be Built

#### 4.1 Backend: Email Service

**Create `apps/api/src/notification/email.service.ts`**:
- Integrate with **Resend** (free tier: 3,000/month) or **SendGrid**
- Environment variable: `EMAIL_API_KEY=`, `EMAIL_FROM=noreply@forgetrack.dev`
- Methods:
  - `sendInvitation(toEmail, inviterName, projectName, inviteLink)`
  - `sendPasswordReset(toEmail, resetLink)`
  - `sendIssueAssigned(toEmail, issueKey, issueTitle, projectName)`

**Replace all `console.log('[SMTP Mock Mailer]...')` in `auth.service.ts`** with real email calls.

#### 4.2 Frontend: Notification Bell

**Create `apps/web/src/components/layout/NotificationBell.tsx`**:
- Polls `GET /api/v1/notifications` (or uses WebSocket)
- Shows unread count badge
- Dropdown list of recent notifications (issue assigned, comment added, status changed)
- Mark as read calls `POST /api/v1/notifications/:id/read`

---

## Phase 5 — GitHub Integration (Real Bi-Directional Sync)

### The Problem
- The `GitHubProvider` class can make real API calls but is never connected to the UI
- CI runs and code links in the Releases view are hardcoded
- Webhook setup is purely UI-side with no real configuration

### What Needs to Be Built

#### 5.1 Backend: GitHub Integration Flow

**Enhance `integration.controller.ts`**:
- `POST /organizations/:orgId/integrations/github` — Link GitHub OAuth token stored during login
- `GET /organizations/:orgId/integrations/github/repos` — List user's GitHub repositories
- `POST /projects/:projectId/integrations/github/link` — Link a specific GitHub repo to a project
- `POST /projects/:projectId/integrations/github/webhook` — Auto-register webhook on the GitHub repo

**Webhook Receipt (`POST /webhooks/github/receive`)**:
- Already partially implemented via `GitHubProvider.parseWebhook()`
- Complete the handler: on push/PR events, auto-create code links on matching issues via commit message parsing (e.g. `Fixes FT-42`)
- Update CI run statuses from `check_run` events

#### 5.2 Frontend: Integration Flow

**Refactor `IntegrationsView.tsx`**:
- Show actual connected repositories, not hardcoded items
- "Connect GitHub" button triggers the GitHub OAuth flow with additional `repo` and `admin:repo_hook` scopes
- Repository list shows real repos with sync status indicators
- Webhook health status shows last delivery timestamp

---

## Phase 6 — AI Workbench (Real Gemini API Calls)

### The Problem
- `AiWorkbenchView.tsx` has hardcoded suggestions that don't update
- `AiService` on the backend may have Gemini calls, but no frontend routing to them

### What Needs to Be Built

#### 6.1 Backend Endpoints Needed

From `apps/api/src/ai/`, expose:
- `POST /projects/:projectId/ai/analyze-issue` — Takes `{ title, description }`, returns quality score and duplicate candidates
- `POST /projects/:projectId/ai/triage` — Auto-suggests priority, component, severity
- `POST /projects/:projectId/ai/search` — Natural language semantic search across issues

#### 6.2 Frontend Integration

**Refactor `AiWorkbenchView.tsx`**:
- "Analyze Duplicate" tab: user pastes title/description, frontend calls `/ai/analyze-issue`, real scores appear
- "Auto Triage" tab: analyzes new issue on creation, shows AI suggestions inline in `CreateIssueModal`
- "Semantic Search" tab: calls `/ai/search?q=...`, shows real matching issues with confidence scores
- All AI suggestions from the API stored in the `ai_suggestions` table and reviewable in the workbench

---

## Additional Gaps Identified (Beyond User's Request)

### 7. Audit Log View
- `audit_events` table exists and is populated by the backend
- The frontend has no UI to view it
- **Add**: `apps/web/src/components/settings/AuditLogView.tsx` — searchable, filterable activity log

### 8. Release Management (Real)
- `ReleasesView.tsx` shows hardcoded releases
- Backend has release/CI service
- **Wire up**: `GET /projects/:projectId/releases` and `GET /projects/:projectId/ci-runs` to real endpoints

### 9. Attachment Uploads
- The `attachments` table and `attachment.controller.ts` exist
- No frontend upload UI exists in `IssueDetailView.tsx`
- **Add**: drag-and-drop file upload with progress, thumbnail previews, and download links

### 10. Profile Management Page
- No UI for users to update their display name, avatar, or change password
- **Add**: `apps/web/src/components/settings/ProfileSettings.tsx`

### 11. Organization Settings
- No way to rename the org, update slug, or manage team-wide settings
- **Add**: Org settings section inside the Settings tab

### 12. Mobile Responsive Layout
- The entire UI is desktop-only
- **Add**: responsive breakpoints, mobile sidebar as a drawer, touch-friendly issue cards

---

## Proposed Execution Order & Priority

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| **Phase 1** — Real OAuth (GitHub + Google) | 🔴 Critical | Medium | Unblocks everything |
| **Phase 2** — Real Project Management | 🔴 Critical | Large | Core use case |
| **Phase 3** — Real Issues & Assignees | 🔴 Critical | Large | Core use case |
| **Phase 5** — GitHub Integration | 🟠 High | Medium | Key differentiator |
| **Phase 4** — Email Notifications | 🟡 Medium | Small | Collaboration enabler |
| **Phase 6** — AI Workbench | 🟡 Medium | Medium | Premium feature |
| **Items 7-12** — Polish | 🟢 Low | Various | Production readiness |

---

## Open Questions for User Review

> [!IMPORTANT]
> **OAuth App Registration**: To implement real GitHub and Google login, you need to:
> 1. Register a GitHub OAuth App at `https://github.com/settings/developers`
>    - Homepage URL: `https://your-vercel-app.vercel.app`
>    - Callback URL: `https://your-render-api.onrender.com/api/v1/auth/github/callback`
> 2. Register a Google OAuth App at `https://console.cloud.google.com`
>    - Authorized redirect URI: `https://your-render-api.onrender.com/api/v1/auth/google/callback`
> 
> **Do you have these OAuth apps set up, or should the plan include instructions for setting them up first?**

> [!IMPORTANT]
> **Email Provider**: For real email invitations and notifications, which provider would you like to use?
> - **Resend** (recommended — free tier 3,000/month, easy API)
> - **SendGrid** (free tier 100/day)
> - **Skip email for now**, use invite links instead

> [!IMPORTANT]
> **Persistence Strategy**: Currently all issue data is in `localStorage`. The backend already supports full CRUD. Should Phase 3 be the **absolute top priority** (connecting frontend to the real database), or should we start with OAuth (Phase 1) first so the user identity is real before we start creating real data?

---

## Environment Variables Summary (Full Production Set)

```env
# Server
NODE_ENV=production
PORT=3001

# Database
DB_HOST=...
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=forgetrack
DB_MIGRATIONS_RUN=true

# Security
SESSION_SECRET=<64-char-random-secret>

# OAuth — GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OAuth — Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Frontend URL (for OAuth redirect after login)
FRONTEND_URL=https://your-app.vercel.app

# Email Notifications
EMAIL_PROVIDER=resend
EMAIL_API_KEY=
EMAIL_FROM=noreply@forgetrack.dev

# AI
GEMINI_API_KEY=

# CORS
CORS_ORIGIN=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api/v1
```
