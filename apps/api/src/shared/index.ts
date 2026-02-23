/**
 * Shared - Cross-Cutting Concerns
 * Centralized infrastructure for all domains
 * 
 * Structure:
 * - modules/: Reusable application modules
 *   - error-handling/: Global exception handling, logging
 *   - document-generation/: PDF generation for invoices, prescriptions, etc.
 *   - messaging/: Multi-channel notifications (WhatsApp, Email, SMS)
 *   - database/: Base repositories, pagination helpers (coming)
 *   - auth/: Authentication strategies, guards (coming)
 *   - config/: Application configuration (coming)
 *   - audit/: Audit logging (coming)
 *   - cache/: Caching layer (coming)
 *   - queue/: Job queue (coming)
 * - constants/: Shared constants across domains
 */

export * from './modules';
