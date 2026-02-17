import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Creates the shared base ESLint flat config for all packages.
 * @param {{ tsconfigRootDir: string, ignores?: string[] }} options
 */
export function createBaseConfig({ tsconfigRootDir, ignores = [] }) {
  return [
    {
      ignores: ['dist', 'node_modules', './eslint.config.js', './vitest.config.ts', 'src/**/*.test.ts', ...ignores],
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
          tsconfigRootDir,
        },
      },
      rules: {
        'no-console': 'off',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'prefer-const': 'error',
        'no-var': 'error',
        'no-param-reassign': 'error',
        'quotes': ['error', 'single'],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/typedef': ['error', {
          arrayDestructuring: false,
          arrowParameter: false,
          memberVariableDeclaration: true,
          objectDestructuring: false,
          parameter: false,
          propertyDeclaration: true,
          variableDeclaration: false,
          variableDeclarationIgnoreFunction: false,
        }],
        '@typescript-eslint/explicit-function-return-type': ['error', {
          allowExpressions: false,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: false,
        }],
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
      },
    },
  ];
}
