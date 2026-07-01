import js from '@eslint/js';
import tsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/*.js',
      '**/*.mjs',
      '**/*.d.ts',
      '**/dist/**',
      '**/lib/**',
      '**/editor/**',
      'packages/template/**',
      'packages/create/template-*/**',
      'packages/docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      tsdoc,
    },
    rules: {
      'require-yield': 'off',
      'grouped-accessor-pairs': ['error', 'getBeforeSet'],
      eqeqeq: ['error', 'always', {null: 'ignore'}],
      curly: ['error', 'multi-line'],
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-namespace': 'off',
      // Permit `import x = require('x')` (the idiomatic way to import a CommonJS
      // `export =` module such as fluent-ffmpeg) while still forbidding bare
      // require() calls.
      '@typescript-eslint/no-require-imports': ['error', {allowAsImport: true}],
      'tsdoc/syntax': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
          filter: {
            regex: '^(__html)$',
            match: false,
          },
        },
        {
          selector: ['variable', 'import'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['global'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'variable',
          modifiers: ['exported'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['exported', 'global'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: ['parameter', 'variable'],
          modifiers: ['unused'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'function',
          modifiers: ['global'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: ['typeLike', 'enumMember'],
          format: ['PascalCase'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          prefix: ['T'],
        },
      ],
    },
  },
);
