// Fetch wrapper for the MathScript API. Always sends cookies, speaks JSON, and throws a typed
// ApiError built from the API's standard error shape: { error: { code, message, details?, requestId? } }.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    cause?: unknown;
  }) {
    super(opts.message, opts.cause === undefined ? undefined : { cause: opts.cause });
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    if (opts.details !== undefined) this.details = opts.details;
    if (opts.requestId !== undefined) this.requestId = opts.requestId;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiFetchOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
};

type StandardErrorBody = {
  error: { code: string; message: string; details?: unknown; requestId?: string };
};

function isStandardErrorBody(value: unknown): value is StandardErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (signal) init.signal = signal;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch (err) {
    // Let aborts propagate untouched so callers (e.g. TanStack Query) can recognise them.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      cause: err,
    });
  }

  const data = await readJson(res);

  if (!res.ok) {
    if (isStandardErrorBody(data)) {
      const { code, message, details, requestId } = data.error;
      throw new ApiError({ status: res.status, code, message, details, requestId });
    }
    throw new ApiError({
      status: res.status,
      code: 'HTTP_ERROR',
      message: res.statusText || `Request failed with status ${res.status}`,
    });
  }

  return data as T;
}

export const apiGet = <T>(path: string, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(path, { ...opts, method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown, opts?: Omit<ApiFetchOptions, 'method'>) =>
  apiFetch<T>(path, { ...opts, method: 'POST', body });

export const apiPatch = <T>(path: string, body?: unknown, opts?: Omit<ApiFetchOptions, 'method'>) =>
  apiFetch<T>(path, { ...opts, method: 'PATCH', body });

export const apiDelete = <T>(path: string, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(path, { ...opts, method: 'DELETE' });

export type Health = { ok: boolean };

export const getHealth = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiGet<Health>('/health', { signal });
