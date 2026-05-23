import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { noProcessEnvSyntaxRule } from '@workspace/eslint-config/base';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-restricted-syntax': ['warn', noProcessEnvSyntaxRule],
    },
  },
  {
    files: ['src/main.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
