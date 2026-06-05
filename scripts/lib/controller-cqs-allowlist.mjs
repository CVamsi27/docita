/**
 * Controller-injected services allowed without *CommandService / *QueryService naming.
 * Prefer documented facades in application services; use this list only when the
 * service file is not yet tracked or is a cross-cutting orchestrator.
 */
export const CONTROLLER_CQS_ALLOWLIST = new Set([
  /** Staff notification orchestrator (whatsapp domain; facade comment on untracked path). */
  "StaffNotificationService",
  /** WhatsApp operations orchestrator: conversations + campaigns surface over the
   * operations repository and the send-message use-case (mixed read/write with role checks). */
  "WhatsappOperationsService",
]);
