module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: { 'import/resolver': { typescript: true } },
  rules: {
    // dead code
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    // import hygiene
    'import/no-unresolved': 'error',
    'import/no-absolute-path': 'error',
    'import/no-useless-path-segments': 'error',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
  },
  ignorePatterns: ['dist','build','.vite','node_modules','**/third_party/**']
};
