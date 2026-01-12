import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';
import {
  DomainEvent,
  DomainEvents,
  EventMetadata,
  EventPayloadMap,
  createEvent,
} from './domain-events';

/**
 * Domain Event Service
 *
 * Provides a type-safe way to emit and subscribe to domain events.
 * This enables loose coupling between modules.
 *
 * Usage:
 * ```typescript
 * // Emit an event
 * this.eventService.emit(DomainEvents.PATIENT_CREATED, {
 *   patientId: patient.id,
 *   mrn: patient.mrn,
 *   firstName: patient.firstName,
 *   lastName: patient.lastName,
 *   phoneNumber: patient.phoneNumber,
 * }, { clinicId, userId, source: 'PatientsService' });
 *
 * // Listen to an event (in a listener class)
 * @OnEvent(DomainEvents.PATIENT_CREATED)
 * handlePatientCreated(event: DomainEvent<PatientCreatedPayload>) {
 *   // Handle the event
 * }
 * ```
 */
@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a domain event
   */
  emit<T extends DomainEvents>(
    type: T,
    payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown,
    context: {
      clinicId: string;
      userId?: string;
      source: string;
      correlationId?: string;
    },
  ): void {
    const correlationId = context.correlationId ?? nanoid();

    const event = createEvent(type, payload, {
      clinicId: context.clinicId,
      userId: context.userId,
      source: context.source,
      correlationId,
    });

    this.logger.debug(
      `Emitting event: ${type} [${correlationId}]`,
      JSON.stringify(payload),
    );

    // Emit the specific event
    this.eventEmitter.emit(type, event);

    // Emit wildcard for audit logging
    this.eventEmitter.emit('domain.*', event);

    // Emit to category (e.g., 'patient.*' for PATIENT_CREATED)
    const category = type.split('.')[0];
    if (category) {
      this.eventEmitter.emit(`${category}.*`, event);
    }
  }

  /**
   * Emit an event asynchronously and wait for all handlers
   */
  async emitAsync<T extends DomainEvents>(
    type: T,
    payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown,
    context: {
      clinicId: string;
      userId?: string;
      source: string;
      correlationId?: string;
    },
  ): Promise<void> {
    const correlationId = context.correlationId ?? nanoid();

    const event = createEvent(type, payload, {
      clinicId: context.clinicId,
      userId: context.userId,
      source: context.source,
      correlationId,
    });

    this.logger.debug(
      `Emitting async event: ${type} [${correlationId}]`,
      JSON.stringify(payload),
    );

    await this.eventEmitter.emitAsync(type, event);
    this.eventEmitter.emit('domain.*', event);
  }

  /**
   * Create a correlation ID for tracing related events
   */
  createCorrelationId(): string {
    return nanoid();
  }

  /**
   * Register an event handler (for programmatic registration)
   */
  on<T extends DomainEvents>(
    type: T,
    handler: (
      event: DomainEvent<
        T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown
      >,
    ) => void | Promise<void>,
  ): void {
    this.eventEmitter.on(type, (event) => void handler(event));
  }

  /**
   * Register a one-time event handler
   */
  once<T extends DomainEvents>(
    type: T,
    handler: (
      event: DomainEvent<
        T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown
      >,
    ) => void | Promise<void>,
  ): void {
    this.eventEmitter.once(type, (event) => void handler(event));
  }

  /**
   * Remove an event handler
   */
  off<T extends DomainEvents>(
    type: T,
    handler: (event: DomainEvent) => void | Promise<void>,
  ): void {
    this.eventEmitter.off(type, (event) => void handler(event));
  }
}
