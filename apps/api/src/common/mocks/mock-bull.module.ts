import { Module, DynamicModule } from '@nestjs/common';

export interface Queue {
  add(data: any, opts?: any): Promise<any>;
  add(name: string, data: any, opts?: any): Promise<any>;
  process(callback: Function): Promise<void>;
  process(name: string, callback: Function): Promise<void>;
  on(event: string, callback: Function): void;
}

export const getQueueToken = (name: string) => `BullQueue_${name}`;

@Module({})
export class MockBullModule {
  static registerQueue(...options: any[]): DynamicModule {
    const providers = options.map((option) => ({
      provide: getQueueToken(option.name),
      useValue: {
        add: async () => {
          console.warn(`[MockQueue] Job added to queue: ${option.name} (Redis Disabled)`);
          return { id: 'mock-job-id' };
        },
        process: async () => {
           console.warn(`[MockQueue] Process handler registered for: ${option.name} (No-op)`);
        },
        on: () => {},
      } as Queue,
    }));

    return {
      module: MockBullModule,
      providers: providers,
      exports: providers.map(p => p.provide),
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
