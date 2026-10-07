import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { testDb } from './helpers/db.js';

describe('app.db (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false, db: testDb() });
  });

  afterAll(async () => {
    await app.close();
  });

  it('inserts and reads an AppMeta row', async () => {
    await app.db.appMeta.create({ data: { key: 'schema', value: 'v1' } });

    const row = await app.db.appMeta.findUnique({ where: { key: 'schema' } });
    expect(row).toMatchObject({ key: 'schema', value: 'v1' });
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });

  it('starts each test with empty tables', async () => {
    expect(await app.db.appMeta.count()).toBe(0);
    // Same primary key as the previous test: would fail without resetDb.
    await app.db.appMeta.create({ data: { key: 'schema', value: 'v2' } });
    expect(await app.db.appMeta.count()).toBe(1);
  });
});
