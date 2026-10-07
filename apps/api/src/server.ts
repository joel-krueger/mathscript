import { loadEnv } from './env.js';
import { buildApp } from './app.js';

const env = loadEnv();

const app = await buildApp({
  databaseUrl: env.DATABASE_URL,
  logger:
    env.NODE_ENV === 'development'
      ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
      : { level: env.LOG_LEVEL },
});

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'shutting down');
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error(err, 'error during shutdown');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
