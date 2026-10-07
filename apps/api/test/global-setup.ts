import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { testDatabaseUrl } from './helpers/db.js';

/** Runs once before the api test project: applies all migrations to the test database. */
export default function setup(): void {
  const apiDir = fileURLToPath(new URL('..', import.meta.url));
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
