# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests first (better layer caching)
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the client (Vite) and server (TypeScript)
RUN pnpm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy drizzle schema (needed at runtime for migrations)
COPY --from=builder /app/drizzle ./drizzle

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "dist/server/_core/index.js"]
