import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import securityPlugin from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';

export default [
  // Frontend configuration (TypeScript/React)
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', '**/*.{js,jsx,ts,tsx}'],
    ignores: ['server/**/*', 'node_modules/**/*', 'build/**/*', 'dist/**/*'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
      security: securityPlugin,
      import: importPlugin,
      promise: promisePlugin,
    },
    rules: {
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'prettier/prettier': 'error',
      'security/detect-object-injection': 'off',
      'import/order': ['error', { 
        'newlines-between': 'always',
        'warnOnUnassignedImports': false
      }],
      'promise/catch-or-return': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
  // Backend/Server configuration (Node.js)
  {
    files: ['server/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: prettierPlugin,
      security: securityPlugin,
      import: importPlugin,
      promise: promisePlugin,
    },
    rules: {
      'no-console': 'off', // Allow console in backend
      'prettier/prettier': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
      'import/order': ['error', { 
        'newlines-between': 'always',
        'warnOnUnassignedImports': false
      }],
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.mjs', '.cjs'],
        },
      },
    },
  },
  // Global ignores
  {
    ignores: [
      'node_modules/**/*',
      'build/**/*',
      'dist/**/*',
      'coverage/**/*',
      '*.config.js',
      '*.config.mjs',
      '*.config.cjs',
      'serviceAccountKey.json',
      '.env*',
    ],
  },
];
