FROM node:20-slim AS build

# neuroverseos-governance is a GitHub dependency — npm needs git to clone it
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production=false

COPY . .

# ── Production stage ──────────────────────────────────────────────────────────
# Run with tsx, not compiled JS — neuroverseos-governance doesn't declare
# subpath exports, so Node's native ESM loader crashes with
# ERR_PACKAGE_PATH_NOT_EXPORTED. tsx handles it correctly.

FROM node:20-slim

WORKDIR /app

RUN addgroup --gid 1001 lenses && \
    adduser --uid 1001 --gid 1001 --disabled-password lenses

COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY package.json tsconfig.json ./

USER lenses

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["npx", "tsx", "src/server.ts"]
