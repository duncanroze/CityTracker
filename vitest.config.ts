import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', 'dashboard', '.next', 'prisma/generated', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['lib/server/**/*.ts', 'hooks/**/*.ts'],
      exclude: [
        'node_modules',
        'dashboard',
        '.next',
        '**/__tests__/**',
        'lib/server/prisma.ts',
        'lib/server/env.ts',
      ],
    },
  },
});
