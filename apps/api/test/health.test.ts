import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { testDatabaseUrl } from './helpers/db.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Exercises the plugin's own client creation and disconnect-on-close.
    app = await buildApp({ logger: false, databaseUrl: testDatabaseUrl() });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/health', '/api/health'])('%s returns ok', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
