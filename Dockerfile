FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src/ src/

# Build — fail the image if TypeScript doesn't compile
RUN npx tsc
RUN mkdir -p dist/worlds && cp src/worlds/*.nv-world.md dist/worlds/

# ── Production stage ──────────────────────────────────────────────────────────

FROM node:20-slim

# Security: run as non-root user
RUN groupadd --gid 1001 lenses && \
    useradd --uid 1001 --gid lenses --shell /bin/bash --create-home lenses

WORKDIR /app

# Copy built app + production dependencies only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json mentra.app.json app_config.json ./

# Own everything as the app user
RUN chown -R lenses:lenses /app

USER lenses

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
