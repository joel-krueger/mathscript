import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'generators',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
