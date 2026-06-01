/** Worker package reuses API modules; specs may live under `src/`. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.(t|j)s$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../api/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
  },
  testEnvironment: 'node',
  passWithNoTests: true,
};
