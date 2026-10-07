import { afterAll, beforeEach } from 'vitest';
import { disconnectTestDb, resetDb } from './helpers/db.js';

// Every api test starts from empty tables.
beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectTestDb();
});
