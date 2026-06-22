FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
RUN pnpm build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    SITEMAP_URL=https://blog.jota.ai/post-sitemap.xml \
    OUTPUT_DIR=public \
    PUBLIC_BASE_URL=http://localhost:8080 \
    LIMIT=20 \
    CONCURRENCY=6 \
    NETWORK_TIMEOUT_MS=30000 \
    PORT=8080

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD node dist/cli.js generate --sitemap "$SITEMAP_URL" --out "$OUTPUT_DIR" --base-url "$PUBLIC_BASE_URL" ${LIMIT:+--limit "$LIMIT"} --concurrency "$CONCURRENCY" --network-timeout-ms "$NETWORK_TIMEOUT_MS" ${PUBLISHER:+--publisher "$PUBLISHER"} ${PUBLISHER_LOGO:+--publisher-logo "$PUBLISHER_LOGO"} && node dist/server.js --dir "$OUTPUT_DIR" --port "$PORT"
