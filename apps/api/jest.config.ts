import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@workspace/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@workspace/db/(.*)$': '<rootDir>/../../packages/db/src/$1',
    '^@workspace/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@workspace/types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@workspace/utils$': '<rootDir>/../../packages/utils/dist/index.cjs',
    '^@workspace/utils/(.*)$': '<rootDir>/../../packages/utils/dist/$1',
    '^@workspace/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
};

export default config;
