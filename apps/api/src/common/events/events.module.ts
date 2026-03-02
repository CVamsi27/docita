import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventService } from './event.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,

      delimiter: '.',

      ignoreErrors: false,

      maxListeners: 20,

      verboseMemoryLeak: true,
    }),
  ],
  providers: [DomainEventService],
  exports: [DomainEventService, EventEmitterModule],
})
export class EventsModule {}
