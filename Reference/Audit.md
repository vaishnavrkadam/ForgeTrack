Key Findings from the Audit
The backend is actually architecturally complete — the NestJS API has real database queries, session management, RBAC, issue service, project service, org service, and full migrations. The entire problem is that the frontend is completely disconnected from it. Everything lives in localStorage.

✅ What's Well-Built (Backend)
The NestJS API is genuinely complete with 18 real modules, 38 database tables, full RBAC (authz), and rich services. Notably:

Auth: Email/password sessions via DB-backed tokens (no JWT), httpOnly cookies, API tokens with ft_ prefix, password reset/email verify flows (console-mocked SMTP)
Issue engine: Extremely rich — workflow transitions, field history, watchers, labels, relationships, custom fields schema, saved searches
AI layer: Semantic search (pgvector), duplicate detection, quality check, triage, summaries
Git integration: Real GitHub & GitLab REST API clients + HMAC webhook parsing for push/PR events
❌ Critical Gaps Found
Frontend is 100% disconnected from backend — apps/web uses only localStorage and hardcoded state. No fetch() calls exist anywhere in the web app. The GitHub/Google login buttons are a setTimeout fake.

No OAuth login — The backend has no OAuth strategy (no Passport, no GitHub/Google callback route). The integrations table stores PATs, not OAuth tokens from a login flow.

No email — Password reset and email verification only console.log() the link (mock mailer).

Missing modules: No TeamsController, no CustomFieldsController, no invitation acceptance endpoint, no PATCH /projects/:id, no user profile endpoint.

No real-time layer — No WebSocket/SSE for live notifications.

No Redis/queue — outbox_events and automation_executions tables exist but no background workers process them.

The 6-Phase Plan Covers:
Phase	What	Why It Matters
1 — Real OAuth	GitHub & Google OAuth flow end-to-end, real user data from provider APIs	No more fake login, real names/avatars
2 — Project Management	Create/Import from GitHub/Join flow, no-project guard	Core use case — empty state UX
3 — Real Issues & Assignees	Wire frontend to real API, assignees from actual team members	Eliminates all dummy data
4 — Email Notifications	Replace console.log mailer with Resend/SendGrid	Real invitations & alerts
5 — GitHub Integration	Webhook sync, commit→issue linking, CI status	Key differentiator feature
6 — AI Workbench	Route Gemini API calls through real endpoints	Premium feature


