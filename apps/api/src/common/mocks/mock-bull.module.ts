import { Module, DynamicModule } from '@nestjs/common';

export interface Queue {
  add(data: any, opts?: any): Promise<any>;
  add(name: string, data: any, opts?: any): Promise<any>;
  process(callback: (...args: any[]) => any): Promise<void>;
  process(name: string, callback: (...args: any[]) => any): Promise<void>;
  on(event: string, callback: (...args: any[]) => any): void;
}

export const getQueueToken = (name: string) => `BullQueue_${name}`;

@Module({})
export class MockBullModule {
  static registerQueue(...options: Array<Record<string, unknown>>): DynamicModule {
    const providers = options.map((option) => ({
      provide: getQueueToken(option.name),
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
