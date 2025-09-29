module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  ignorePatterns: [
    'client/',
    'docs/',
    'node_modules/',
    'problem manual/',
    'scripts/',
  ],
  rules: {},
};
