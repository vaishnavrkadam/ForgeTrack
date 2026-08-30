# ForgeTrack 🚀

> **High-Velocity Issue Tracking, Defect Intelligence, and Engineering Workflow Platform**

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

ForgeTrack is a modern, high-performance issue tracking and engineering management platform inspired by the legendary rigor of Bugzilla, re-architected with sub-second keyboard ergonomics, AI duplicate intelligence, release health shields, and bi-directional Git workflows.

---

## 🌟 Key Highlights

- ⚡ **Sub-Second Keyboard Velocity**: Global Command Palette (`⌘K` / `Ctrl+K`), instant issue creation (`C`), quick status switching, and keyboard-driven navigation.
- 🤖 **AI Duplicate Intelligence & Triage**: Semantic vector embeddings paired with Reciprocal Rank Fusion (RRF) to detect duplicates in real-time, predict severity/components, and generate executive thread summaries.
- 🛡️ **Release Health & CI Blocker Shield**: Automated blocker gates preventing unstable deployments, linked directly to release milestones and pull requests.
- 🔗 **Bi-Directional Git Integrations**: Webhook ingestion for GitHub and GitLab with timing-safe HMAC signature validation and automated commit/branch linking.
- 🔒 **Hardened Enterprise Security**: SSRF boundary validators, rate-limiting guards, parameterized SQL engines, strict CSP/security response headers, and atomic sequence generators.
- 📊 **Audit Trails & Monotonic Integrity**: Full lifecycle mutation logging with PostgreSQL row-level locks guaranteeing zero sequence gaps.

---

## 🏗️ Repository Architecture

ForgeTrack is structured as a TypeScript npm monorepo:

```text
ForgeTrack/
├── apps/
│   ├── web/                     # Next.js 14 App Router frontend (React, Tailwind CSS, Lucide)
│   │   ├── src/app/             # Pages, layouts, auth callback, invitation join flows
│   │   ├── src/components/      # Issues, Kanban, AI Workbench, Command Palette, Modals
│   │   └── src/lib/             # Zustand/Context state stores, API clients, audio engines
│   └── api/                     # NestJS backend application
│       ├── src/ai/              # AI duplicate search, Google Gemini integration, RRF scoring
│       ├── src/auth/            # GitHub OAuth, session management, secure cookies
│       ├── src/authz/           # RBAC permissions guard and organization scoping
│       ├── src/issues/          # Atomic issue lifecycle, search, custom fields, comments
│       ├── src/releases/        # Release health monitoring and blocker shields
│       ├── src/integrations/    # GitHub & GitLab webhook handlers with HMAC verification
│       └── src/common/security/ # SSRF protection, rate limiting, and security interceptors
├── packages/
│   ├── contracts/               # Shared API request/response DTOs and interfaces
│   └── shared/                  # Common TypeScript utilities, constants, and helpers
├── infra/
│   ├── docker/                  # Dockerfiles and container configurations
│   └── migrations/              # Database schema migrations
├── DEPLOYMENT.md                # Step-by-step production deployment guide
└── USER_GUIDE.md                # Comprehensive user and administrator manual
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Canvas Confetti, Lucide Icons |
| **Backend** | NestJS 10, Express, TypeORM, Class Validator, Cookie Parser, RxJS |
| **Data & Storage** | PostgreSQL 16 (pgvector support), Redis (caching & queues), In-Memory fallback |
| **AI & Search** | Google Gemini API / Local Embeddings, Reciprocal Rank Fusion (RRF), Full-Text Indexing |
| **Auth & Security** | GitHub OAuth 2.0, Secure Session Tokens, Timing-Safe HMAC, SSRF Guard, Helmet Headers |
| **DevOps & Containers** | Docker, Docker Compose, Vercel, Render, Railway |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **PostgreSQL**: `v15+` (or Docker for containerized database)
- **Git**

---

### Option 1: Quickstart with Docker Compose (Recommended)

Run the entire ForgeTrack stack (PostgreSQL + NestJS API + Next.js Web) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/vaishnavrkadam/ForgeTrack.git
cd ForgeTrack

# 2. Copy environment file
cp .env.example .env

# 3. Start all services in detached mode
docker compose up -d --build
```

Access the applications:
- **Frontend Web UI**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1

---

### Option 2: Local Development Setup

#### 1. Install Monorepo Dependencies

```bash
npm install
```

#### 2. Configure Environment Variables

**Backend (`apps/api/.env`):**
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=forgetrack
DB_LOGGING=false
SESSION_SECRET=super-secret-session-key-32-chars-min
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/auth/github/callback
GEMINI_API_KEY=your-gemini-api-key-optional
CORS_ORIGIN=http://localhost:3000
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

#### 3. Build Shared Packages & Run

```bash
# Build contracts and shared libraries
npm run build:api

# Start both API and Web concurrently
npm run dev
```

The web interface will be available at `http://localhost:3000`.

---

## 🔒 Security Architecture & Hardening

ForgeTrack adheres to defense-in-depth engineering standards:

1. **GitHub OAuth & Secure Sessions**: Single sign-on backed by authenticated OAuth 2.0 flow with hardened cookies (`SameSite: Lax`, `HttpOnly`, `Path=/`).
2. **SSRF Boundary Protection**: All outbound webhook invocations and integrations pass through `SsrfValidator` to prevent unauthorized internal network and cloud metadata access (`169.254.169.254`, `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`).
3. **Timing-Safe HMAC Verification**: Webhook signatures from GitHub/GitLab use `crypto.timingSafeEqual` to eliminate side-channel timing attack vectors.
4. **Parameterized SQL Ingestion**: Strict TypeORM parameterized queries `$1, $2` eliminate SQL injection risks.
5. **Security Response Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Production HTTPS)
6. **Input Sanitization & Whitelisting**: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` to reject malicious or extraneous payloads.

---

## 🚢 Production Deployment

### Managed Cloud Architecture (Vercel + Render / Railway)

1. **Deploy API on Render / Railway**:
   - Build Command: `npm install && npm run build:api`
   - Start Command: `npm run start:api`
   - Set environment variables (`DB_HOST`, `DB_PASSWORD`, `SESSION_SECRET`, `CORS_ORIGIN`).
2. **Deploy Web on Vercel**:
   - Build Command: `npm run build:web`
   - Environment Variable: `NEXT_PUBLIC_API_URL=https://<your-api-domain>/api/v1`

For step-by-step instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts API and Web development servers concurrently |
| `npm run build` | Builds all packages (`contracts`, `shared`, `api`, `web`) |
| `npm run build:api` | Compiles `@forgetrack/contracts`, `@forgetrack/shared`, and `@forgetrack/api` |
| `npm run build:web` | Compiles `@forgetrack/contracts`, `@forgetrack/shared`, and `@forgetrack/web` |
| `npm run start:api` | Runs the compiled NestJS production server |
| `npm run start:web` | Runs the Next.js production server |
| `npm run test` | Executes Jest test suites across all workspaces |
| `npm run lint` | Runs ESLint across workspaces |
| `npm run format` | Formats codebase using Prettier |

---

## 📖 Documentation

- 📘 [User Guide](USER_GUIDE.md) — Comprehensive guide to keyboard shortcuts, AI triage, Kanban, and release tracking.
- 🚀 [Deployment Guide](DEPLOYMENT.md) — Production cloud and Docker hosting instructions.
- 📐 [Reference Specifications](Reference/) — Architectural blueprints, DB schema, and API contracts.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
