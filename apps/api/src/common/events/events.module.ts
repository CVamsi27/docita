import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventService } from './event.service';

/**
 * Events Module
 *
 * Provides event-driven communication between modules.
 * This module is global, so you don't need to import it in other modules.
 *
 * Features:
 * - Type-safe event emission
 * - Wildcard event listeners for audit/logging
 * - Async event handling support
 * - Correlation ID for tracing
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for category-based listening
      wildcard: true,
      // Delimiter for event names (e.g., 'patient.created')
      delimiter: '.',
      // Don't throw on emit errors (log instead)
      ignoreErrors: false,
      // Max listeners per event
      maxListeners: 20,
      // Enable verbose memory leak warnings
      verboseMemoryLeak: true,
    }),
  ],
  providers: [DomainEventService],
  exports: [DomainEventService, EventEmitterModule],
})
export class EventsModule {}
