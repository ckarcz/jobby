import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  {
    ignores: ['dist', 'node_modules', "./eslint.config.js", "./vitest.config.ts", "./vitest.integration.config.ts", "src/**/*.test.ts", "src/utils/test-helpers.ts", "tests"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ============================================
      // GENERAL CODE QUALITY
      // ============================================
      'no-console': 'off',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-param-reassign': 'error',
      'quotes': ['error', 'single'],

      // ============================================
      // TYPESCRIPT STRICT TYPING (C#-like)
      // ============================================
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',

      // Force explicit types on variables and class members
      '@typescript-eslint/typedef': ['error', {
        arrayDestructuring: false,
        arrowParameter: false,
        memberVariableDeclaration: true,         // Class properties need types
        objectDestructuring: false,
        parameter: false,
        propertyDeclaration: true,               // Interface properties need types
        variableDeclaration: false,              // ← Turn this off
        variableDeclarationIgnoreFunction: false,
      }],

      // Explicit return types on all functions
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: false,                // Anonymous functions need types
        allowTypedFunctionExpressions: true,    // const foo: Func = () => {} - OK
        allowHigherOrderFunctions: true,        // map(x => x) - OK
        allowDirectConstAssertionInArrowFunctions: true,
        allowConciseArrowFunctionExpressionsStartingWithVoid: false
      }],

      // Explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Force override keyword like C#
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // ============================================
      // TYPESCRIPT STYLE
      // ============================================
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      // Additional strictness
      '@typescript-eslint/no-non-null-assertion': 'error',        // Ban foo!.bar
      '@typescript-eslint/prefer-nullish-coalescing': 'error',    // Use ?? not ||
      '@typescript-eslint/prefer-optional-chain': 'error',        // Use ?. not && chains
      '@typescript-eslint/no-unnecessary-condition': 'error',     // Catch always-true/false
      '@typescript-eslint/switch-exhaustiveness-check': 'error',  // Switch must be exhaustive
    },
  },
);
