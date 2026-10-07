import { BrowserRouter, Route, Routes } from 'react-router';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';

export function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight text-indigo-600">MathScript</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
