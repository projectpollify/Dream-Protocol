import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
        '**/scripts/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['packages/**/src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@dream/identity': path.resolve(__dirname, './packages/01-identity/src'),
      '@dream/bridge-legacy': path.resolve(__dirname, './packages/02-bridge-legacy/src'),
      '@dream/user': path.resolve(__dirname, './packages/03-user/src'),
      '@dream/economy': path.resolve(__dirname, './packages/04-economy/src'),
      '@dream/token-exchange': path.resolve(__dirname, './packages/05-token-exchange/src'),
    },
  },
});
