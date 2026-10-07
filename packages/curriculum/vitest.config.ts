import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'curriculum',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
