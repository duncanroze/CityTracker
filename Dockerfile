FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

# Install all deps
RUN pnpm install --frozen-lockfile

# Copy prisma schema and generate client
COPY server/prisma server/prisma
RUN pnpm --filter server db:generate

# Copy all source
COPY server server
COPY client client

# ── Server dev target ──
FROM base AS server
EXPOSE 3000
CMD ["pnpm", "--filter", "server", "dev"]

# ── Client dev target ──
FROM base AS client
EXPOSE 5173
CMD ["pnpm", "--filter", "client", "dev", "--", "--host"]
