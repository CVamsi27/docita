/**
 * Service Abstractions (Dependency Inversion)
 *
 * These interfaces define the contracts for external integrations,
 * allowing multiple implementations and easy testing via mocks.
 *
 * Each external service is represented as an interface, following the
 * Dependency Inversion Principle: "Depend on abstractions, not concrete implementations."
 */

export * from './whatsapp.service.interface';
export * from './payment.service.interface';
export * from './ai.service.interface';
export * from './email.service.interface';
export * from './ocr.service.interface';
export * from './fhir.service.interface';
