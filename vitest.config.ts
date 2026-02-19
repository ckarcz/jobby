import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['packages/*/src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: ['packages/*/tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          teardownTimeout: 10_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/dist/**/*',
        '**/test-helpers.ts',
        '**/example.ts',
        '**/*.d.ts',
        'packages/jobby-cli/src/types.ts',
        'packages/jobby-cli/src/ui/hooks/**',
        'packages/jobby-cli/src/ui/components/**',
        'packages/jobby-cli/src/ui/App.tsx',
        'packages/jobby-cli/src/commands/ui.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
