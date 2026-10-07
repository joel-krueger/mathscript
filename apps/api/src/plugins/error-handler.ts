import { STATUS_CODES } from 'node:http';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError, type ErrorResponseBody } from '../errors.js';

interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

function send(
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: ErrorResponseBody = { error: { code, message, requestId: request.id } };
  if (details !== undefined) body.error.details = details;
  return reply.status(statusCode).send(body);
}

function zodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((key) => (typeof key === 'number' ? key : String(key))),
    message: issue.message,
  }));
}

/** e.g. 413 -> 'PAYLOAD_TOO_LARGE'. */
function codeForStatus(statusCode: number): string {
  return (STATUS_CODES[statusCode] ?? 'Error').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Maps every error (and unknown routes) to the standard shape
 * `{ error: { code, message, details?, requestId } }`. 5xx errors are logged at error level and
 * answered with a generic message; client errors are logged at info level.
 */
export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler((error: unknown, request, reply) => {
      if (error instanceof ZodError) {
        request.log.info({ err: error }, 'request validation failed');
        return send(request, reply, 400, 'VALIDATION_ERROR', 'Invalid request', zodIssues(error));
      }

      if (error instanceof AppError) {
        if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
        else request.log.info({ err: error }, error.message);
        return send(request, reply, error.statusCode, error.code, error.message, error.details);
      }

      if (isObject(error) && Array.isArray(error.validation)) {
        request.log.info({ err: error }, 'request validation failed');
        const details = (error.validation as Record<string, unknown>[]).map((v) => ({
          path: String(v.instancePath ?? '')
            .split('/')
            .filter(Boolean),
          message: String(v.message ?? 'is invalid'),
        }));
        return send(request, reply, 400, 'VALIDATION_ERROR', 'Invalid request', details);
      }

      const statusCode = isObject(error) ? error.statusCode : undefined;
      if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
        request.log.info({ err: error }, 'client error');
        // Fastify's own FST_* messages (e.g. invalid JSON body) are safe to show; anything
        // else gets the generic HTTP status text.
        const fstCode =
          isObject(error) && typeof error.code === 'string' && error.code.startsWith('FST_');
        const message =
          fstCode && error instanceof Error
            ? error.message
            : (STATUS_CODES[statusCode] ?? 'Bad request');
        return send(request, reply, statusCode, codeForStatus(statusCode), message);
      }

      request.log.error({ err: error }, 'unhandled error');
      return send(request, reply, 500, 'INTERNAL_ERROR', 'Something went wrong');
    });

    app.setNotFoundHandler((request, reply) => {
      request.log.info('route not found');
      return send(
        request,
        reply,
        404,
        'NOT_FOUND',
        `Route ${request.method} ${request.url.split('?')[0]} not found`,
      );
    });
  },
  { name: 'error-handler' },
);
