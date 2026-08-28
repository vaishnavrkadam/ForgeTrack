# ForgeTrack — Step-by-Step Production Deployment Guide

This guide details multiple deployment strategies for **ForgeTrack** (Next.js Web Frontend + NestJS Backend API + PostgreSQL Database).

---

## Architecture Overview

ForgeTrack is built as an npm monorepo containing:
- **`apps/web`**: Next.js 14 frontend application (React, Tailwind CSS).
- **`apps/api`**: NestJS backend API (TypeORM, PostgreSQL, Auth, Webhooks, AI Workbench).
- **`packages/contracts` & `packages/shared`**: Shared TypeScript data models, DTOs, and utility libraries.

---

## Deployment Option 1: Managed Cloud Platforms (Recommended)

### A. Deploy Backend API (`apps/api`) & Database on Render / Railway

1. **Provision PostgreSQL Database**:
   - Create a new PostgreSQL database on [Render](https://render.com) or [Railway](https://railway.app).
   - Note the connection credentials (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`).

2. **Deploy NestJS API Service**:
   - Connect your GitHub repository (`https://github.com/vaishnavrkadam/ForgeTrack`).
   - Configure build and start settings:
     - **Build Command**: `npm install && npm run build --workspace=@forgetrack/contracts --workspace=@forgetrack/shared && npm run build --workspace=@forgetrack/api`
     - **Start Command**: `npm run start --workspace=@forgetrack/api`
   - **Environment Variables**:
     ```env
     NODE_ENV=production
     PORT=3001
     DB_HOST=<your-postgres-host>
     DB_PORT=5432
     DB_USERNAME=<your-postgres-user>
     DB_PASSWORD=<your-postgres-password>
     DB_DATABASE=<your-postgres-database>
     DB_MIGRATIONS_RUN=true
     DB_LOGGING=false
     SESSION_SECRET=<generate-random-32-character-secret>
     GEMINI_API_KEY=<your-google-gemini-api-key-optional>
     CORS_ORIGIN=https://<your-frontend-domain>.vercel.app
     ```

---

### B. Deploy Frontend Web App (`apps/web`) on Vercel

1. **Import Repository to Vercel**:
   - Go to [Vercel](https://vercel.com) and click **Add New Project**.
   - Select your repository `vaishnavrkadam/ForgeTrack`.
2. **Configure Project Settings**:
   - **Root Directory**: `apps/web` (or leave root and configure root install).
   - **Framework Preset**: Next.js.
   - **Build Command**: `npm run build --workspace=@forgetrack/contracts --workspace=@forgetrack/shared && npm run build --workspace=@forgetrack/web`
   - **Output Directory**: `.next`
3. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-api-domain>.onrender.com/api/v1
   ```
4. **Deploy**:
   - Click **Deploy**. Vercel will build the optimized production client and assign an SSL-enabled domain.

---

## Deployment Option 2: Full Docker Stack on VPS (DigitalOcean / AWS / Linode)

You can run the entire production environment (Database + Redis + API + Web) on any VPS using Docker Compose.

### 1. Connect to your VPS and Clone the Repository
```bash
git clone https://github.com/vaishnavrkadam/ForgeTrack.git
cd ForgeTrack
```

### 2. Configure Production Environment Variables
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
nano .env
```
Fill in secure passwords for `DB_PASSWORD` and `SESSION_SECRET`.

### 3. Build & Run Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Verify Services
- **Web Interface**: `http://<your-server-ip>:3000`
- **API Endpoint**: `http://<your-server-ip>:3001/api/v1`

---

## Security Checklist Before Going Live

- [x] **Timing-Safe HMAC Verification**: All webhook payloads (GitHub/GitLab) and session tokens use constant-time comparisons (`crypto.timingSafeEqual`).
- [x] **SSRF Protection**: Outbound integrations and webhooks are restricted from calling loopback (`127.0.0.1`), local subnets (`10.0.0.0/8`, `192.168.0.0/16`), and cloud metadata APIs (`169.254.169.254`).
- [x] **Restricted CORS**: Set `CORS_ORIGIN` to only allow your official frontend domain(s).
- [x] **Parameterized Queries**: All SQL executions use `$1, $2` parameters to prevent SQL injection.
- [x] **File Upload Scanning**: MIME types are validated, dangerous file types blocked, and binary signatures checked.
- [x] **Rate Limiting**: sliding window rate limiter protects endpoints against brute force attacks.
