FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/user-client/package.json apps/user-client/
COPY apps/admin-client/package.json apps/admin-client/
COPY e2e/package.json e2e/

RUN pnpm install --frozen-lockfile --filter user-client...

COPY apps/api apps/api
COPY apps/user-client apps/user-client

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL


ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN pnpm --filter api db:generate && pnpm --filter user-client build

FROM nginx:alpine

COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/user-client/dist /usr/share/nginx/html

EXPOSE 80
