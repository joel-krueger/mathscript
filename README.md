# MathScript

An adaptive math practice platform for children, built around the Common Core skill hierarchy.
See [PLAN.md](./PLAN.md) for the full implementation plan.

## Prerequisites

- Node.js 22 (see `.nvmrc`; `nvm use`)
- pnpm 10 (`corepack enable` picks up the version pinned in `package.json`)
- Docker (for local Postgres)

## Setup

```sh
pnpm install
```

## Scripts

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `pnpm typecheck`    | Type-check every workspace package            |
| `pnpm lint`         | Lint the whole repo with ESLint               |
| `pnpm lint:fix`     | Lint and auto-fix what ESLint can             |
| `pnpm format`       | Format the whole repo with Prettier           |
| `pnpm format:check` | Check formatting without writing (used in CI) |
| `pnpm test`         | Run all Vitest projects once                  |
| `pnpm test:watch`   | Run Vitest in watch mode                      |

## Local database

Postgres 16 runs in Docker via `docker-compose.yml` (service `db`, data in the `pgdata` volume).

```sh
cp .env.example .env   # first time only
pnpm db:up             # start and wait until healthy
pnpm db:logs           # follow logs
pnpm db:down           # stop (data is kept in the volume)
```

Connection URLs (also in `.env.example`):

- App: `postgresql://mathscript:mathscript@localhost:5432/mathscript`
- Integration tests: `postgresql://mathscript:mathscript@localhost:5432/mathscript_test`

The test database is created by `docker/postgres/init/01-create-test-db.sql`, which only runs when the volume is first
initialized. To recreate from scratch: `docker compose down -v && pnpm db:up`.

Connect with psql:

```sh
docker compose exec db psql -U mathscript                   # inside the container
psql postgresql://mathscript:mathscript@localhost:5432/mathscript   # from the host, if psql is installed
```

## Running the API

The Fastify API lives in `apps/api`. It reads the repo-root `.env` (real environment variables take precedence) and
validates it with Zod at startup; a missing or invalid variable prints the issues and exits with code 1.

```sh
pnpm dev:api                          # watch mode (tsx), same as: pnpm --filter @mathscript/api dev
pnpm --filter @mathscript/api start   # run without watch
curl localhost:3000/health            # {"ok":true}
```

| Variable       | Default       | Notes                                                     |
| -------------- | ------------- | --------------------------------------------------------- |
| `DATABASE_URL` | (required)    | Postgres connection URL                                   |
| `NODE_ENV`     | `development` | `development` \| `test` \| `production`                   |
| `PORT`         | `3000`        |                                                           |
| `HOST`         | `127.0.0.1`   |                                                           |
| `LOG_LEVEL`    | `info`        | pino level; logs are pretty-printed in `development` only |

Routes are mounted under `/api` (the web dev proxy forwards `/api`). The health check is served at both `/health` and
`/api/health`.

Every error response (validation failures, `AppError`s thrown from routes, unknown routes, unexpected errors) has the
same shape. `details` is present for validation errors (a list of `{ path, message }`); unexpected errors return
`500 INTERNAL_ERROR` with a generic message and are logged with their stack.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [],
    "requestId": "…"
  }
}
```

Each request gets an ID (a well-formed incoming `x-request-id` header is reused, otherwise a UUID), which appears as
`reqId` in the logs and is echoed in the `x-request-id` response header.

## Database migrations & tests

The API uses Prisma 7 (`apps/api/prisma/schema.prisma`, config in `apps/api/prisma.config.ts`, which loads the
repo-root `.env`). The client is generated into `apps/api/src/generated/prisma` (gitignored; regenerated on
`pnpm install` and by `pnpm --filter @mathscript/api db:generate`) and connects through `@prisma/adapter-pg`. Routes
use it as `app.db`.

```sh
pnpm db:migrate                                      # create/apply migrations on DATABASE_URL (prisma migrate dev)
pnpm db:migrate --name add_users                     # name a new migration
pnpm db:reset                                        # drop, re-apply all migrations, and seed (dev DB only)
pnpm db:seed                                         # run apps/api/prisma/seed.ts (idempotent)
pnpm --filter @mathscript/api db:deploy              # apply pending migrations without prompts (CI/prod)
```

API tests (`apps/api/test`) run against `TEST_DATABASE_URL`, never the dev database. Vitest's global setup runs
`prisma migrate deploy` on the test database once per run, every test starts with all tables truncated (`resetDb()`
in `apps/api/test/helpers/db.ts`), and test files run one at a time. Run them with `pnpm test` or
`pnpm --filter @mathscript/api test`.

## Running the web app

The React app (Vite, React Router, TanStack Query, Tailwind CSS v4) lives in `apps/web`. The Vite dev server runs on
port 5173 and proxies `/api` to the API on `http://127.0.0.1:3000`, so start the API too.

```sh
pnpm dev:web                          # Vite dev server on http://localhost:5173
pnpm dev                              # API and web together
pnpm --filter @mathscript/web build   # type-check and build to apps/web/dist
pnpm --filter @mathscript/web preview # serve the production build
```

The home page calls `/api/health` and shows "API OK" when the API is reachable.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`. A single job on
`ubuntu-latest` runs `pnpm install --frozen-lockfile`, Prisma client generation (`db:generate` in `apps/api`, if
present), then `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm -r --if-present build`.
Superseded runs on the same ref are cancelled.

CI does not use `docker-compose.yml`. Postgres 16 runs as a GitHub Actions service container on `localhost:5432` with
the same credentials, and because service containers cannot run init scripts, a workflow step creates the
`mathscript_test` database. `DATABASE_URL`, `TEST_DATABASE_URL`, and `NODE_ENV=test` are set as job environment
variables.
