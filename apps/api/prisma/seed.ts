import { loadEnv } from '../src/env.js';
import { createPrismaClient } from '../src/db.js';

// Idempotent seed: safe to run repeatedly (`pnpm db:seed`, and after `pnpm db:reset`).
const env = loadEnv();
const db = createPrismaClient(env.DATABASE_URL);

try {
  await db.appMeta.upsert({
    where: { key: 'seeded' },
    update: { value: 'true' },
    create: { key: 'seeded', value: 'true' },
  });
  console.log('Seed complete.');
} finally {
  await db.$disconnect();
}
