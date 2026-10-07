import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, apiPost, isApiError } from './api';
import { shouldRetry } from './queryClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected promise to reject');
}

describe('apiFetch', () => {
  it('returns parsed JSON and sends cookies + JSON headers', async () => {
    const fetchMock = stubFetch(
      async () => new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );

    const result = await apiPost<{ id: number }>('/things', { name: 'x' });

    expect(result).toEqual({ id: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/things');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(init?.body).toBe(JSON.stringify({ name: 'x' }));
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  });

  it('returns undefined for an empty 204 response', async () => {
    stubFetch(async () => new Response(null, { status: 204 }));
    await expect(apiFetch('/things/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws an ApiError built from the standard error shape', async () => {
    const details = [{ path: ['name'], message: 'Required' }];
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request',
              details,
              requestId: 'req-123',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    const err = await catchError(apiFetch('/things'));

    expect(isApiError(err)).toBe(true);
    const apiErr = err as ApiError;
    expect(apiErr).toBeInstanceOf(Error);
    expect(apiErr.status).toBe(400);
    expect(apiErr.code).toBe('VALIDATION_ERROR');
    expect(apiErr.message).toBe('Invalid request');
    expect(apiErr.details).toEqual(details);
    expect(apiErr.requestId).toBe('req-123');
  });

  it('falls back to HTTP_ERROR and statusText for a non-JSON error body', async () => {
    stubFetch(
      async () =>
        new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    );

    const err = await catchError(apiFetch('/health'));

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: 'HTTP_ERROR', message: 'Bad Gateway' });
    expect((err as ApiError).requestId).toBeUndefined();
  });

  it('maps network failures to NETWORK_ERROR with status 0', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    const err = await catchError(apiFetch('/health'));

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('isApiError rejects plain errors', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ status: 400, code: 'X' })).toBe(false);
  });
});

describe('shouldRetry', () => {
  const err = (status: number) => new ApiError({ status, code: 'X', message: 'x' });

  it('never retries 4xx ApiErrors', () => {
    expect(shouldRetry(0, err(400))).toBe(false);
    expect(shouldRetry(0, err(404))).toBe(false);
  });

  it('retries network and 5xx errors up to twice', () => {
    expect(shouldRetry(0, err(0))).toBe(true);
    expect(shouldRetry(1, err(500))).toBe(true);
    expect(shouldRetry(2, err(500))).toBe(false);
  });
});
