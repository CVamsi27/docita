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
  /** WhatsApp approval route (legacy controller): single mutation `approvePrescription` /
   * `approveInvoice`. Both are writes; introducing a *CommandService wrapper would add
   * a pass-through. The 2026-08 facade-removal refactor (2881b8929) intentionally
   * promoted the use-case to the controller boundary. */
  "ApprovalService",
  /** WhatsApp legacy logs route: `getLogs` + `getWhatsappStats` are both reads on the
   * same data source behind a single legacy controller. Rename to *QueryService
   * tracked as a follow-up; the rename would be mechanical and adds no behavior. */
  "MessagingService",
  /** WhatsApp resend route: single mutation `resendMessage`. Pure write — wrapping in
   * a *CommandService would be a pass-through. */
  "WhatsappResendService",
  /** WhatsApp template-message route: single mutation `handleSendCustomMessage`. */
  "TemplateMessageService",
  /** Consent compliance: `recordConsent` / `withdrawConsent` / `setMarketingConsent` /
   * `setDpdpNoticeConsent` (writes) plus `hasValidConsent` / `getConsentHistory` /
   * `validateWhatsAppConsent` (reads). Mixed CQS behind a single DPDP consent surface.
   * The 2026-08 facade-removal refactor (19535755b) promoted the previously-wrapped
   * `DPDPComplianceService` use-cases into this class; splitting into
   * `ConsentCommandService` + `ConsentQueryService` is tracked as a follow-up. */
  "ConsentComplianceService",
]);
