module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es2021': true
  },
  'parserOptions': {
    'ecmaVersion': 13,
    'sourceType': 'module'
  },
  'rules': {
    'indent': [ 'error', 2 ],
    'linebreak-style': [ 'error', 'unix' ],
    'quotes': [ 'error', 'single' ],
    'semi': [ 'error', 'always' ]
  },
  'overrides': [
    {
      'files': ['*.js'],
      'extends': 'eslint:recommended',
    },
    {
      'files': ['*.ts', '*.tsx'],
      'extends': ['plugin:@typescript-eslint/recommended'],
      'parser': '@typescript-eslint/parser',
      'plugins': ['@typescript-eslint'],
    },
  ],
  // we have no intentions to use eslint-plugin-jest.
  'globals': {
    'jest': true,
    'describe': true,
    'it': true,
    'expect': true,
    'beforeEach': true,
    'afterEach': true,
  }
};
