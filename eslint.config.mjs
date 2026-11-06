import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const forbidden = [
  {
    selector: "CallExpression[callee.property.name='unsafe']",
    message: 'sql.unsafe prohibido: usa plantillas parametrizadas.',
  },
  {
    selector: "CallExpression[callee.property.name='raw']",
    message: 'sql.raw prohibido: usa plantillas parametrizadas.',
  },
  {
    selector: "CallExpression[callee.name='eval']",
    message: 'eval prohibido.',
  },
]

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'database/migrations/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-undef': 'off',
      'max-lines': ['error', { max: 150 }],
      'no-restricted-syntax': ['error', ...forbidden],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['database/scripts/bootstrap.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
