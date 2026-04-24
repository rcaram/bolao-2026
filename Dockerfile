# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE_PLATFORM=linux/amd64

FROM --platform=$NODE_IMAGE_PLATFORM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/bolao/package.json artifacts/bolao/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json
COPY scripts/package.json scripts/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app

COPY . .

# Frontend build requires both env vars in vite config.
ENV NODE_ENV="production"
ENV BASE_PATH="/"
ENV PORT="8080"

RUN pnpm --filter @workspace/bolao run build && \
    pnpm --filter @workspace/api-server run build

FROM base AS runtime
WORKDIR /app

ENV NODE_ENV="production"
ENV BACKEND_PORT="8080"

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/bolao/dist/public ./artifacts/bolao/dist/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
