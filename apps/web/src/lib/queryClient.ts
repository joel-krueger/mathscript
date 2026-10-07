import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api';

const MAX_RETRIES = 2;

/** Retry network failures and 5xx up to twice; never retry 4xx client errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
