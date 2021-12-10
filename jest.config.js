module.exports = {
  verbose: true,
  moduleFileExtensions: [
    'js', 'ts'
  ],
  transform : {
    '^.+\\.[t|j]sx?$': 'babel-jest',  // do not change this line
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    // https://stackoverflow.com/questions/55794280/jest-fails-with-unexpected-token-on-import-statement
    // avoid "Cannot use import statement outside a module" error for ky
    'node_modules/(?!(ky)/)',
  ],
  snapshotSerializers: [
  ],
  testMatch: [
    '**/test/**/*.(test).(js|ts)',
  ],
  testPathIgnorePatterns: [
  ],
  collectCoverage: false,
  collectCoverageFrom: [
  ],
  coverageDirectory: '<rootDir>/coverage/',
  coverageReporters: ['html', 'lcov', 'json', 'text-summary', 'clover'],
  reporters: ['default'],
  setupFiles: [
    '<rootDir>/jest.init.js',
  ],
  testEnvironment: 'jsdom',
};
