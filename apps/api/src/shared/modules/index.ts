/**
 * Shared Module Index
 * Central export point for all cross-cutting concern modules
 */

// Error Handling (Global)
export {
  ErrorHandlingModule,
  LoggerService,
} from './modules/error-handling/error-handling.module';
export * from './modules/error-handling';

// Document Generation
export { DocumentGenerationModule } from './modules/document-generation/document-generation.module';
export * from './modules/document-generation';

// Messaging (Multi-channel Notifications)
export { MessagingModule } from './modules/messaging/messaging.module';
export * from './modules/messaging';

// Future modules structure:
// - Database (base repositories, pagination helpers)
// - Auth (strategies, guards, decorators)
// - Config (application configuration)
// - Audit (audit logging for sensitive operations)
// - Cache (caching layer)
// - Queue (job queue handling)
