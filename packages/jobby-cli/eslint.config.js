import { defineConfig } from 'eslint/config';
import { createBaseConfig } from '../../eslint.config.base.js';

export default defineConfig(
  ...createBaseConfig({
    tsconfigRootDir: import.meta.dirname,
    ignores: ['./vitest.integration.config.ts', 'src/utils/test-helpers.ts', 'tests'],
  }),
);
