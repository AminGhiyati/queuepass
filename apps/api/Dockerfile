FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/user-client/package.json apps/user-client/
COPY apps/admin-client/package.json apps/admin-client/
COPY e2e/package.json e2e/

RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api


ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN pnpm --filter api db:generate && pnpm --filter api build

FROM node:22-alpine

WORKDIR /repo

COPY --from=builder /repo /repo

WORKDIR /repo/apps/api
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
