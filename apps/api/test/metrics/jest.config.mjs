import path from 'node:path';
import base from '../../jest.config.ts';

export default {
  ...base,
  rootDir: path.resolve(import.meta.dirname, '../..'),
  roots: ['<rootDir>/test/metrics'],
  testRegex: undefined,
  testMatch: ['<rootDir>/test/metrics/**/*.integration-spec.ts'],
  setupFiles: [],
  collectCoverage: false,
  collectCoverageFrom: [],
  coverageThreshold: undefined,
  testTimeout: 15_000,
};
