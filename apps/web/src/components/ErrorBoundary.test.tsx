import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow: Error | null = null;

function Bomb() {
  if (shouldThrow) throw shouldThrow;
  return <p>All good</p>;
}

afterEach(() => {
  cleanup();
  shouldThrow = null;
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders the fallback when a child throws, and recovers after reset', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = new Error('boom');

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go home' }).getAttribute('href')).toBe('/');
    expect(screen.queryByText(/Error reference/)).toBeNull();

    shouldThrow = null;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('All good')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('shows the requestId for an ApiError', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = new ApiError({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal error',
      requestId: 'req-abc',
    });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('req-abc')).toBeTruthy();
  });
});
