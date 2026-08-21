#!/bin/sh
set -e

node_modules/.bin/prisma db push
node dist/prisma/ensureAdminAccount.js
exec node dist/src/index.js
