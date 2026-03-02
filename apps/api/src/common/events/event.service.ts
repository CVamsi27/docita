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

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

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

    this.eventEmitter.emit(type, event);

    this.eventEmitter.emit('domain.*', event);

    const category = type.split('.')[0];
    if (category) {
      this.eventEmitter.emit(`${category}.*`, event);
    }
  }

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

  createCorrelationId(): string {
    return nanoid();
  }

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

  off<T extends DomainEvents>(
    type: T,
    handler: (event: DomainEvent) => void | Promise<void>,
  ): void {
    this.eventEmitter.off(type, (event) => void handler(event));
  }
}
