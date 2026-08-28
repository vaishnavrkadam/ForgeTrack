# ==========================================
# ForgeTrack API - Production Container
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and package manifests
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies and build contracts, shared, and api
RUN npm ci
RUN npm run build --workspace=@forgetrack/contracts --workspace=@forgetrack/shared
RUN npm run build --workspace=@forgetrack/api

# Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install production dependencies only
RUN npm ci --omit=dev

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
