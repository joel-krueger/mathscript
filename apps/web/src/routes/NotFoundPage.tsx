import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-bold text-indigo-600">Page not found</h2>
      <p className="mt-3 text-slate-600">We looked everywhere, but this page isn&apos;t here.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
      >
        Go home
      </Link>
    </section>
  );
}
