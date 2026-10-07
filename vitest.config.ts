import { defineConfig } from 'vitest/config';

// Root Vitest config: runs every workspace package as a Vitest "project" in one process.
// A package opts in by adding its own `vitest.config.ts` (using `defineProject` with a
// unique `test.name`); packages without one are skipped by these globs.
export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
  },
});
