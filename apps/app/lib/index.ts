/**
 * Application Utilities Library
 * Centralized collection of utilities for the entire app
 *
 * Structure:
 * - api/: API client, endpoints, fetch wrapper
 * - auth/: Authentication utilities (coming)
 * - validation/: Form validation functions
 * - formatters/: Date, currency, phone formatting
 * - constants/: App-wide constants
 * - errors/: Error handling and parsing
 * - hooks/: App-level hooks (use-patients, use-notifications, etc.)
 */

// API utilities
export * from './api';

// Validation
export * from './validation';

// Formatters
export * from './formatters';

// Errors
export * from './errors';

// Hooks - Feature-specific hooks go here
export * from './hooks';
