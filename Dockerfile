FROM oven/bun:1 AS build

# neuroverseos-governance is a GitHub dependency — bun needs git to clone it
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN bun install

# Bun skips prepare scripts for git dependencies — build governance dist manually
RUN cd node_modules/neuroverseos-governance && bun install && bun run build || true

COPY . .

# ── Production stage ──────────────────────────────────────────────────────────
# SDK imports hono/bun which requires Bun runtime

FROM oven/bun:1

WORKDIR /app

COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY package.json tsconfig.json ./

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
