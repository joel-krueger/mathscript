import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { PrismaClient } from './db.js';
import { dbPlugin } from './plugins/db.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { genReqId, requestIdPlugin } from './plugins/request-id.js';
import { healthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  /** Passed through to Fastify; `false` disables logging (handy in tests). */
  logger?: FastifyServerOptions['logger'];
  /** Postgres URL for `app.db`. Tests pass `TEST_DATABASE_URL`; the server passes `DATABASE_URL`. */
  databaseUrl?: string;
  /** An existing Prisma client to use as `app.db` instead (not disconnected on close). */
  db?: PrismaClient;
}

/**
 * Builds the Fastify app without listening, so tests can use `app.inject()`.
 * One of `databaseUrl` or `db` is required.
 *
 * Routing: all application routes are mounted under `/api` (the web dev proxy
 * forwards `/api`). The health check is additionally exposed at `/health` for
 * direct probes such as `curl localhost:3000/health`.
 *
 * Errors: every error response uses `{ error: { code, message, details?, requestId } }`
 * (see `plugins/error-handler.ts`); route code throws `AppError` or lets a `ZodError` escape.
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  // Request IDs: an incoming well-formed `x-request-id` is reused, otherwise a UUID is
  // generated. Fastify adds it to every request log line as `reqId`.
  const app = Fastify({ logger: opts.logger ?? true, genReqId });

  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(dbPlugin, { databaseUrl: opts.databaseUrl, client: opts.db });

  await app.register(healthRoutes);
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
