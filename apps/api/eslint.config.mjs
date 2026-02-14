// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Warn about direct process.env access - migrate to ConfigService gradually
      // NOTE: This is a deprecation warning for the transition period.
      // Once all services use ConfigService, this can be changed to 'error'.
      'no-restricted-globals': ['warn', {
        name: 'process',
        message: 'Use ConfigService.get() or ConfigService.getOrThrow() instead of process.env (CQ-3 migration)',
      }],
    },
  },
  // Exception: Allow process.env in main.ts, config files, seed files, and test files
  {
    files: ['src/main.ts', 'src/**/config.ts', 'src/**/*.config.ts', 'src/seed*.ts', 'test/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
