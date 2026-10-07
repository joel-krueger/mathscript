/**
 * Application errors. Route code throws these (or a `ZodError` from parsing input) and the
 * error-handler plugin turns them into the standard response shape:
 *
 *   { "error": { "code": string, "message": string, "details"?: unknown, "requestId"?: string } }
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function badRequest(message = 'Bad request', details?: unknown): AppError {
  return new AppError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'You do not have permission to do that'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(message = 'Conflict', details?: unknown): AppError {
  return new AppError(409, 'CONFLICT', message, details);
}

/** Body of every error response. */
export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
