/**
 * NestJS EventEmitter2 channel names for cross-module integration (payloads vary).
 * Use with @OnEvent / EventEmitter2.emit instead of string literals.
 * Envelope-typed bus events use {@link DomainEvents} via DomainEventService.
 */
export enum ApplicationEvents {
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  DOCTOR_DELAY_MARKED = 'doctor-delay.marked',
  PRESCRIPTION_CREATED = 'prescription.created',
  INVOICE_GENERATED = 'invoice.generated',
  PAYMENT_CAPTURED = 'payment.captured',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATION_BULK_DELETED = 'notification.bulk-deleted',
  WHATSAPP_MESSAGE_SENT = 'whatsapp.message.sent',
  OCR_PAGE_PROCESSED = 'ocr.page.processed',
  AI_CREDITS_CONSUMED = 'ai.credits.consumed',
  WHATSAPP_DELIVERY_STALE = 'whatsapp.delivery.stale',
  // Emitted by clinics.onboarding after the onboarding transaction commits.
  // Subscriptions subscribes to capture any referrer code from
  // planSelection.referralCode (cross-domain integration without a direct
  // clinics.application → subscriptions.core.services import).
  CLINIC_ONBOARDED = 'clinic.onboarded',
  // Emitted by internal-referral.service after a Referrer is created. The
  // welcome pipeline (ReferrerWelcomeService) subscribes to this to render
  // the showcase PDF, upload it, and send the WABA welcome template.
  REFERRER_CREATED = 'referrer.created',
  // Emitted by the operator console (or any internal trigger) to request
  // an on-demand run of the referrer-code backfill. Listened to by
  // ReferrerCodeBackfillService, which is the same service that fires
  // automatically on app/worker boot.
  REFERRER_BACKFILL_REQUESTED = 'referrer.backfill.requested',
  // Emitted by InternalPricingAdminService.updatePricingTier after a
  // tier-pricing row is written. Listened to by PricingService to
  // invalidate the in-process tier cache so an INTERNAL operator
  // editing tier pricing sees the change on the next request rather
  // than waiting for the 5-min TTL.
  TIER_PRICING_UPDATED = 'tierPricing.updated',
  // Appended to the transactional outbox by FacilityLeadCommandService
  // (atomically with the lead row on submit / the CONVERTED transition) and
  // republished by the outbox relay. FacilityLeadNotificationService
  // listens to materialize the internal Docita-ops notification.
  FACILITY_LEAD_CREATED = 'facility-lead.created',
  FACILITY_LEAD_CONVERTED = 'facility-lead.converted',
  /**
   * Emitted once per saturation episode by PoolSaturationHistoryService when
   * the connection pool has had callers queued beyond its threshold. Routed to
   * OpsAlertListener; the same condition is always logged locally so the signal
   * does not depend on a webhook being configured.
   */
  POOL_SATURATION_SUSTAINED = 'ops.pool-saturation.sustained',
}
