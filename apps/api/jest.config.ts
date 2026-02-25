/**
 * Jest Configuration for @docita/api
 *
 * ⚠️  WHY JEST FOR API (not Vitest)?
 * ────────────────────────────────────
 * NestJS has first-class Jest support with dedicated testing utilities:
 * - `@nestjs/testing` module for dependency injection and TestingModule
 * - Built-in decorators for mocking providers and modules (@Mock, @Provide)
 * - Native integration with NestJS lifecycle hooks (onModuleInit, etc.)
 * - Better support for NestJS Guards, Interceptors, and Pipes in tests
 * - Official NestJS docs and examples standardize on Jest
 * - Established patterns in NestJS ecosystem for e2e and unit testing
 *
 * While Vitest is faster, switching would require:
 * - Rewriting `@nestjs/testing` integrations
 * - Manually mocking NestJS-specific features
 * - Losing community support and patterns for backend unit tests
 *
 * Frontend (apps/app, apps/admin) use Vitest for speed (HMR-friendly).
 * API stays on Jest for NestJS ecosystem compatibility.
 */

import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/uuid-mock.ts',
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
