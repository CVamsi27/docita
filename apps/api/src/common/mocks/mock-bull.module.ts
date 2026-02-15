import { Module, DynamicModule } from '@nestjs/common';

export interface Queue {
  add(data: Record<string, unknown>, opts?: Record<string, unknown>): Promise<Record<string, unknown>>;
  add(name: string, data: Record<string, unknown>, opts?: Record<string, unknown>): Promise<Record<string, unknown>>;
  process(callback: (job: { data: Record<string, unknown> }) => Promise<void> | void): Promise<void>;
  process(name: string, callback: (job: { data: Record<string, unknown> }) => Promise<void> | void): Promise<void>;
  on(event: string, callback: (...args: Array<string | number | Record<string, unknown>>) => void): void;
}

export const getQueueToken = (name: string) => `BullQueue_${name}`;

@Module({})
export class MockBullModule {
  static registerQueue(...options: Array<Record<string, unknown>>): DynamicModule {
    const providers = options.map((option) => ({
      provide: getQueueToken(option.name as string),
      useValue: {
        add: () => {
          console.warn(
            `[MockQueue] Job added to queue: ${option.name} (Redis Disabled)`,
          );
          return Promise.resolve({ id: 'mock-job-id' });
        },
        process: () => {
          console.warn(
            `[MockQueue] Process handler registered for: ${option.name} (No-op)`,
          );
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

  // Mock forRoot to prevent errors if we accidentally use it,
  // though we are replacing imports so it shouldn't be called.
  static forRoot(): DynamicModule {
    return {
      module: MockBullModule,
    };
  }
}
