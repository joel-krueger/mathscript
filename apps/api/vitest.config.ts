import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
  },
});
