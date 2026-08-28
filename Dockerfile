# syntax=docker/dockerfile:1.4

# ===== Base (Debian slim for runtime) =====
FROM node:20-slim AS base
WORKDIR /app
RUN mkdir -p /app/public/uploads/products

# ===== Dependencies (Debian for building native modules) =====
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --ignore-scripts

# ===== Development (Debian slim runtime with copied node_modules) =====
FROM base AS development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/* && \
    npm install @next/swc-linux-x64-musl --ignore-scripts --save-dev && \
    npm rebuild better-sqlite3
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ===== Builder (production build) =====
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ===== Runner (production) =====
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built assets from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules for runtime (includes native modules)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Data volume (SQLite + backups) - empty dir, will be mounted at runtime
# COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]