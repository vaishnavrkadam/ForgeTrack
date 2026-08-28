# ==========================================
# ForgeTrack Web - Production Container
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and package manifests
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm ci
RUN npm run build --workspace=@forgetrack/contracts --workspace=@forgetrack/shared
RUN npm run build --workspace=@forgetrack/web

# Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@forgetrack/web"]
