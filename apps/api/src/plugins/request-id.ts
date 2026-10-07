import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import fp from 'fastify-plugin';

export const REQUEST_ID_HEADER = 'x-request-id';

const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Fastify `genReqId`: reuses a well-formed incoming `x-request-id` (≤ 64 chars of
 * `[A-Za-z0-9_-]`), otherwise generates a UUID. Anything else in the header is ignored.
 */
export function genReqId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  if (typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)) return incoming;
  return randomUUID();
}

/** Echoes the request ID back in the `x-request-id` response header. */
export const requestIdPlugin = fp(
  async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header(REQUEST_ID_HEADER, request.id);
    });
  },
  { name: 'request-id' },
);
