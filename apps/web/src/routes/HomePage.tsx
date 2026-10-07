import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../lib/api';

export function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: false });

  return (
    <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-medium text-slate-800">System status</h2>
      <div className="mt-4" role="status">
        {health.isPending ? (
          <p className="text-slate-500">Checking API…</p>
        ) : health.isError ? (
          <p className="text-red-600">API unavailable: {health.error.message}</p>
        ) : health.data.ok ? (
          <p className="font-semibold text-emerald-600">API OK</p>
        ) : (
          <p className="text-red-600">API reported a problem</p>
        )}
      </div>
    </section>
  );
}
