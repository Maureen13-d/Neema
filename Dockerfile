# Builds the Neema web app and serves the static files with nginx.
# Build context is the repo root, because the web app imports packages/core.

FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable

# Install dependencies first so this layer is reused when only source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY packages/core packages/core
COPY apps/web apps/web
RUN pnpm --filter @neema/web build

FROM nginx:stable-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
