# ---------- Build stage ----------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Build tools required for native modules (bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Pin pnpm to match the local toolchain
RUN npm install -g pnpm@11.3.0

# Authenticate with GitHub Packages for the @mateo-6 scope
ARG NPM_TOKEN
RUN if [ -n "$NPM_TOKEN" ]; then npm config set '//npm.pkg.github.com/:_authToken' "$NPM_TOKEN"; else echo "warning: NPM_TOKEN not set, install of @mateo-6 packages may fail"; fi

# Install dependencies (locked versions from pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

# Build TypeScript sources
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# ---------- Runtime stage ----------
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Railway injects PORT automatically and provides REDIS_URL from the Redis plugin
CMD ["node", "dist/index.js"]