# Frontend Dockerfile (monorepo: build from repo root with docker build -f frontend/Dockerfile .)
# Uses Next.js standalone output for a minimal production image.

# Stage 1: Build (Debian/glibc for Tailwind Oxide native bindings; Alpine/musl lacks them)
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace and dependency files
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Install all dependencies (workspaces); includes Linux native bindings for Tailwind/PostCSS
RUN npm ci --ignore-scripts && npm install

# Copy frontend source
COPY frontend ./frontend/

# Build (standalone output is set in next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --prefix frontend

# Stage 2: Production (standalone)
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone output (server.js + .next/static are inside standalone)
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
