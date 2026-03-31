import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],
  collectCoverageFrom: [
    'src/domains/feedback/application/services/**/*.ts',
    'src/domains/reminders/application/services/**/*.ts',
    'src/domains/patients/application/services/{patient.service.ts,patient-timeline.service.ts,medical-history.service.ts,medication-dose.service.ts}',
    'src/domains/appointments/application/services/{queue.service.ts,follow-up.service.ts}',
    'src/domains/appointments/core/domain-services/**/*.ts',
    'src/domains/billing/core/services/{pricing.service.ts,overage-calculation.service.ts,claim-validation.service.ts}',
    'src/domains/dashboards/dashboard/dashboard.service.ts',
    'src/shared/modules/auth/auth/{auth.service.ts,clinic-auth-cache.service.ts,jwt.strategy.ts}',
    'src/shared/modules/auth/guards/{roles.guard.ts}',
    'src/shared/modules/messaging/whatsapp/{messaging.service.ts,response-handler.service.ts,staff-notification.service.ts,system-events.service.ts,whatsapp-client.service.ts,whatsapp-webhook.service.ts,templates.service.ts}',
    'src/shared/modules/messaging/whatsapp/listeners/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
    '!src/**/*.controller.ts',
    '!src/**/*.interface.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/uuid-mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@workspace/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@workspace/db/(.*)$': '<rootDir>/../../packages/db/src/$1',
    '^@workspace/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@workspace/types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@workspace/utils$': '<rootDir>/../../packages/utils/dist/index.cjs',
    '^@workspace/utils/(.*)$': '<rootDir>/../../packages/utils/dist/$1',
    '^@workspace/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
    '^otplib$': '<rootDir>/test/mocks/otplib.mock.ts',
  },
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 35,
      lines: 40,
      statements: 40,
    },
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
};

export default config;
