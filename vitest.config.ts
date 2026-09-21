import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Local packaging/platform verification copies must not become another test suite.
    include: ['tests/**/*.test.ts'],
  },
});
