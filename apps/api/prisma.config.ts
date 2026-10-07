import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env files itself; load the repo-root .env so the CLI
// sees DATABASE_URL. Variables already set in the environment win (the test
// global setup relies on this to point the CLI at TEST_DATABASE_URL).
loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Fallback keeps `prisma generate` working without a database configured
    // (e.g. postinstall on a fresh clone); commands that connect will fail clearly.
    url: process.env.DATABASE_URL ?? '',
  },
});
