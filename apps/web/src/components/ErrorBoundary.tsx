import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isApiError } from '../lib/api';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Top-level error boundary: shows a friendly, kid-safe page instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorFallback error={error} onReset={this.reset} />;
  }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="text-2xl font-bold text-indigo-600">Something went wrong</h1>
        <p className="mt-3 text-slate-600">
          Oops! We hit a bump. Let&apos;s try that again, or head back home.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 focus:outline-none"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl px-6 py-3 text-lg font-semibold text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50"
          >
            Go home
          </a>
        </div>
        {requestId ? (
          <p className="mt-6 text-xs text-slate-400">
            Error reference: <code>{requestId}</code>
          </p>
        ) : null}
      </section>
    </div>
  );
}
