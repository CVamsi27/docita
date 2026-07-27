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
  /** Partner auth: OTP request (write), OTP verify (write + JWT mint), access-token
   * verify (read), refresh (write). All four surface under the same /partner/auth
   * controller, so splitting would just add a thin pass-through facade. */
  "PartnerAuthService",
  /** Partner portal: /partner/me (read), payouts list (read), referrals list
   * (read), banking upsert (write). Mixed read/write behind a single partner
   * session — a Command/Query split would only produce a thin facade. */
  "PartnerPortalService",
  /** Clinic-side referral port adapter: read status + apply code. Both routes
   * land in the same controller and share the same session/clinicId binding. */
  "IClinicReferralAppService",
]);
