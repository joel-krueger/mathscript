import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from '../src/app.js';
import { AppError, notFound } from '../src/errors.js';
import { testDb } from './helpers/db.js';

const bodySchema = z.object({ name: z.string().min(1), age: z.number().int() });

describe('error handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false, db: testDb() });
    // Test-only routes, registered before the app is ready.
    app.post('/test/zod', async (request) => bodySchema.parse(request.body));
    app.get('/test/app-error', async () => {
      throw new AppError(409, 'CLASS_CODE_TAKEN', 'That class code is taken', { field: 'code' });
    });
    app.get('/test/not-found', async () => {
      throw notFound('No such class');
    });
    app.get('/test/boom', async () => {
      throw new Error('database password is hunter2');
    });
    app.post(
      '/test/schema',
      {
        schema: {
          body: { type: 'object', required: ['n'], properties: { n: { type: 'number' } } },
        },
      },
      async () => ({ ok: true }),
    );
    app.get('/test/ok', async () => ({ ok: true }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with issue details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test/zod',
      payload: { name: '', age: 1.5 },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Invalid request' });
    expect(body.error.requestId).toEqual(expect.any(String));
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { path: ['name'], message: expect.any(String) },
        { path: ['age'], message: expect.any(String) },
      ]),
    );
  });

  it('maps a Fastify schema validation error to 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({ method: 'POST', url: '/test/schema', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('maps an AppError to its status, code, message and details', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: {
        code: 'CLASS_CODE_TAKEN',
        message: 'That class code is taken',
        details: { field: 'code' },
        requestId: expect.any(String),
      },
    });
  });

  it('maps the notFound() helper to 404 NOT_FOUND', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/not-found' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatchObject({ code: 'NOT_FOUND', message: 'No such class' });
  });

  it('maps an unknown error to 500 with a generic message', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/boom' });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        requestId: expect.any(String),
      },
    });
    expect(res.body).not.toContain('hunter2');
  });

  it('returns 404 NOT_FOUND for an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope?x=1' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route GET /api/nope not found',
    });
  });

  it('returns 400 for an invalid JSON body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test/zod',
      headers: { 'content-type': 'application/json' },
      payload: '{"name":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatchObject({ code: 'BAD_REQUEST', message: expect.any(String) });
  });

  it('generates a request ID, echoes it in the header and the error body', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.json().error.requestId).toBe(id);
  });

  it('sets x-request-id on successful responses too', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/ok' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('honours a well-formed incoming x-request-id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/boom',
      headers: { 'x-request-id': 'abc_123-XYZ' },
    });
    expect(res.headers['x-request-id']).toBe('abc_123-XYZ');
    expect(res.json().error.requestId).toBe('abc_123-XYZ');
  });

  it.each(['has spaces', 'semi;colon', 'x'.repeat(65)])(
    'ignores a malformed incoming x-request-id (%s)',
    async (incoming) => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/ok',
        headers: { 'x-request-id': incoming },
      });
      expect(res.headers['x-request-id']).not.toBe(incoming);
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
