module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'
    ]],
    'type-empty': [2, 'never'],
    'scope-enum': [0],
    'scope-empty': [0],
    'subject-case': [0],
    'subject-min-length': [2, 'always', 5],
  },
};
