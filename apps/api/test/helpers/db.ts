import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { createPrismaClient, type PrismaClient } from '../../src/db.js';

loadDotenv({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)), quiet: true });

/** URL of the separate integration-test database (never the dev database). */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)');
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL; tests truncate every table');
  }
  return url;
}

let client: PrismaClient | undefined;

/** Shared Prisma client for the test database (one per test file / worker). */
export function testDb(): PrismaClient {
  client ??= createPrismaClient(testDatabaseUrl());
  return client;
}

export async function disconnectTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

/** Empties every app table in `public` (all except Prisma's migration history). */
export async function resetDb(db: PrismaClient = testDb()): Promise<void> {
  const rows = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"public"."${r.table_name.replaceAll('"', '""')}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
