# Base image - Alpine for minimal footprint
FROM node:22-alpine AS base

# ─── Stage 1: Install ALL dependencies (including Alpine-compatible sharp) ───
FROM base AS deps
RUN apk add --no-cache openssl vips-dev
WORKDIR /app

# Copy package manifests for workspace resolution
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/prisma ./apps/web/prisma
COPY apps/web/prisma.config.ts ./apps/web/

# Install fresh dependencies
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    npm install --legacy-peer-deps

# Reinstall sharp specifically for Alpine/musl so the native binary is correct
# This MUST happen in deps so runner can simply copy node_modules without any npm run
RUN rm -rf node_modules/@img node_modules/sharp && \
    npm install --os=linux --libc=musl --cpu=x64 sharp --legacy-peer-deps

# ─── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache openssl vips-dev
WORKDIR /app

# Copy source files first
COPY . .

# Force remove any node_modules or .next that might have bypassed .dockerignore from host
RUN rm -rf node_modules apps/web/node_modules apps/web/.next

# Now copy the cleanly built node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client
RUN npm --workspace=@masdika/web run postinstall --if-present

ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    GROQ_API_KEY="dummy" \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}" \
    npm run build

# Bundle custom server for WebSocket/VNC support in standalone mode.
# next, ws, cookie are marked --external so they must exist in node_modules at runtime.
RUN npx esbuild apps/web/src/server.ts \
    --bundle \
    --platform=node \
    --outfile=apps/web/.next/standalone/apps/web/custom-server.js \
    --external:next \
    --external:ws \
    --external:cookie \
    --external:crypto \
    --external:http \
    --external:https \
    --external:node-cron \
    --external:@elastic/elasticsearch \
    --external:elastic-apm-node

# Bundle worker script
RUN npx esbuild apps/web/scripts/worker.ts \
    --bundle \
    --platform=node \
    --outfile=apps/web/.next/standalone/apps/web/worker.js \
    --external:next \
    --external:ws \
    --external:cookie \
    --external:crypto \
    --external:http \
    --external:https \
    --external:node-cron \
    --external:@prisma/client \
    --external:node-ssh \
    --external:@next/env \
    --external:@elastic/elasticsearch \
    --external:elastic-apm-node

# Bundle vnc-proxy script
RUN npx esbuild apps/web/scripts/vnc-proxy.ts \
    --bundle \
    --platform=node \
    --outfile=apps/web/.next/standalone/apps/web/vnc-proxy.js \
    --external:http \
    --external:https \
    --external:crypto \
    --external:cookie \
    --external:http-proxy \
    --external:@next/env

# ─── Stage 3: Lean production image ──────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl vips dcron wget su-exec postgresql-client mariadb-client mongodb-tools docker-cli iputils mtr traceroute bind-tools



RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --shell /bin/sh nextjs

# Create required directories
RUN mkdir -p apps/web/public/uploads \
    apps/web/storage/secure-media \
    apps/web/storage/tickets \
    apps/web/.next

RUN chown -R nextjs:nodejs apps

# Copy Next.js standalone output (includes server.js + compiled app)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma.config.ts ./apps/web/

# CRITICAL: Override the standalone's minimal node_modules with the FULL node_modules
# from deps stage (which includes next, react, ws, cookie, @swc/helpers, and
# Alpine-compatible sharp). NO npm install runs here to avoid pruning.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

ENV NEXT_SHARP_PATH=/app/node_modules/sharp

# Add entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Container starts as root, entrypoint.sh fixes permissions then drops to nextjs via su-exec
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "cd /app/apps/web && exec node custom-server.js"]
