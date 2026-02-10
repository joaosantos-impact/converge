# Backend Dockerfile (monorepo: build from repo root with docker build -f backend/Dockerfile .)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace and dependency files
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY backend/prisma ./backend/prisma/
COPY backend/prisma.config.ts ./backend/

# Install all dependencies (workspaces)
RUN npm ci --ignore-scripts

# Generate Prisma client (Prisma 7: URL from prisma.config.ts, not schema)
RUN cd backend && npx prisma generate

# Copy backend source
COPY backend ./backend/

# Build backend
RUN npm run build --prefix backend

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Copy backend runtime: dist, prisma schema, config, package.json
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/backend/package.json ./package.json

# Hoisted node_modules from workspace (backend resolves from here)
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma --config=./prisma.config.ts && node dist/main.js"]
