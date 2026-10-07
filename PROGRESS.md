# Progress

## Phase 0 — Foundations ✅ complete (2026-10-07)

| Task | Description | Status | Notes |
|---|---|---|---|
| T0.1 | Monorepo skeleton | ✅ | pnpm 10 workspaces, Node 22 |
| T0.2 | Lint & format | ✅ | ESLint 9 + typescript-eslint, Prettier. TypeScript pinned `~6.0.3` (typescript-eslint doesn't support TS 7 yet) |
| T0.3 | Local Postgres | ✅ | Postgres 16 in docker-compose; `mathscript` + `mathscript_test` DBs |
| T0.4 | API hello world | ✅ | Fastify 5, Zod env validation (fail fast), `/health` + `/api/health` |
| T0.5 | Web hello world | ✅ | Vite 8, React 19, react-router 7, TanStack Query 5, Tailwind 4; `/api` proxy |
| T0.6 | Test harness | ✅ | Vitest 5 projects; `pnpm test` runs all packages |
| T0.7 | CI | ✅ | GitHub Actions, checked locally with actionlint. **Not yet run on GitHub (no remote)** |
| T0.8 | Prisma + test DB helper | ✅ | Prisma 7.10 + `@prisma/adapter-pg`; test DB migrated in globalSetup, truncated before each test |
| T0.9 | Error handling & logging | ✅ | Standard `{ error: { code, message, details?, requestId } }`; `x-request-id`; web `ApiError`, ErrorBoundary, 404 page |

Final verification: install, lint, format:check, typecheck, build all pass; **33 tests in 10 files pass**; `pnpm dev` end-to-end smoke test OK.

## Next up: Phase 1 — Database schema
Ready to start: T1.1 (users), T1.4 (standards/skills). Also unblocked: P5 generator framework (T5.1), P4 catalog format (T4.1).
