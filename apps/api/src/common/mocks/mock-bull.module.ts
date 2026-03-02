import { Module, DynamicModule } from '@nestjs/common';

export interface Queue {
  add(
    data: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  add(
    name: string,
    data: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  process(
    callback: (job: { data: Record<string, unknown> }) => Promise<void> | void,
  ): Promise<void>;
  process(
    name: string,
    callback: (job: { data: Record<string, unknown> }) => Promise<void> | void,
  ): Promise<void>;
  on(
    event: string,
    callback: (
      ...args: Array<string | number | Record<string, unknown>>
    ) => void,
  ): void;
}

export const getQueueToken = (name: string) => `BullQueue_${name}`;

function getQueueName(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return 'unknown';
}

@Module({})
export class MockBullModule {
  static registerQueue(
    ...options: Array<Record<string, unknown>>
  ): DynamicModule {
    const providers = options.map((option) => ({
      provide: getQueueToken(getQueueName(option.name)),
      useValue: {
        add: () => {
          const queueName = getQueueName(option.name);

          return Promise.resolve({ id: 'mock-job-id' });
        },
        process: () => {
          const queueName = getQueueName(option.name);

          return Promise.resolve();
        },
        on: () => {},
      } as Queue,
    }));

    return {
      module: MockBullModule,
      providers: providers,
      exports: providers.map((p) => p.provide),
    };
  }

  static forRoot(): DynamicModule {
    return {
      module: MockBullModule,
    };
  }

  static forRootAsync(..._args: unknown[]): DynamicModule {
    return {
      module: MockBullModule,
    };
  }
}
