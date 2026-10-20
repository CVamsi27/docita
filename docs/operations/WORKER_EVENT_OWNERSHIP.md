# Worker event ownership

Verified locally on 2026-10-13 for the two-month stability freeze. This note resolves the `PAYMENT_CAPTURED` ownership question in [stability task T6](../superpowers/plans/2026-10-13-two-month-stability.md). No production events were replayed and no notification consumer was added.

## Current module graph

The current compiled worker graph includes `WhatsappEventListener`, which declares the `PAYMENT_CAPTURED` handler. The [2026-10-12 QA report](../audits/2026-10-12-backend-reliability-qa.md#compatibility-rollback-and-remaining-boundary) identified a possible missing subscriber from the lean worker modules; that finding is not established by the current transitive graph.

The actual entry point is [WorkerModule](../../apps/api/src/worker.module.ts#L61). It imports [BillingWorkerModule](../../apps/api/src/domains/billing/billing.worker.module.ts#L16), whose payment dependency is `PaymentsModule`; there is no module named `BillingPaymentsModule`. Its lean [WhatsAppWorkerModule](../../apps/api/src/domains/whatsapp/whatsapp.worker.module.ts#L18) supplies message services, without the payment listener. However, another import path reaches the full clinic module:

```text
WorkerModule
  → ClinicalSchedulerModule → ClinicalModule
  → WhatsAppModule → SupportWhatsAppModule → WhatsappModule
  → WhatsappEventListener.handlePaymentCaptured
```

The edges are declared in [ClinicalSchedulerModule](../../apps/api/src/domains/clinical/clinical.scheduler.module.ts#L9), [ClinicalModule](../../apps/api/src/domains/clinical/clinical.module.ts#L34), [WhatsAppModule](../../apps/api/src/domains/whatsapp/whatsapp.module.ts#L34), and [SupportWhatsAppModule](../../apps/api/src/shared/modules/support-whatsapp/support-whatsapp.module.ts#L10). `WhatsAppModule` and `WhatsappModule` are different classes. The latter declares [WhatsappEventListener and staff notification services](../../apps/api/src/domains/whatsapp/whatsapp-clinic.module.ts#L75). Clinical auth also reaches [ClinicsModule](../../apps/api/src/domains/clinics/clinics.module.ts#L43), which imports `SubscriptionsModule`, `BillingModule`, and `WhatsappModule`.

The [runtime resolution regression](../../apps/worker/test/runtime-module-resolution.test.mjs) requires the emitted worker module with ordinary Node resolution, then traverses actual Nest import metadata. Before the manifest repair it failed on `@workspace/auth`, followed by the existing `@aws-sdk/client-rds` import. Declaring these existing runtime dependencies makes the check pass without `NODE_PATH`. It uses synthetic configuration, does not instantiate providers, and makes no database or provider calls. This proves loadable metadata; it does not prove a full Nest bootstrap, deployed listener registration, or successful delivery. Scheduler enablement remains governed by [WorkerModule's existing `ENABLE_SCHEDULERS` configuration](../../apps/api/src/worker.module.ts#L61).

## Payment delivery boundaries

| Boundary                            | Current behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Consequence                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture → event                     | [Capture transaction](../../apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts#L280) appends an outbox event with unique `payment-captured:${providerPaymentId}` identity and the capture amount.                                                                                                                                                                                                                                                                                                                   | Repeated capture ingestion does not create another event with that identity. It does not deduplicate downstream effects.                                                                    |
| Event → acknowledgment              | [Relay](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts#L184) checks for listeners, awaits dispatch under tenant scope, and sets `processedAt` after listeners resolve. Rejections and timeouts retain retry/error state with bounded attempts.                                                                                                                                                                                                                                                                                     | Missing or rejecting listeners remain recoverable. A listener that suppresses its failure can still cause acknowledgment.                                                                   |
| Payment → patient confirmation      | [Listener](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts#L65) passes only invoice and clinic identity. [SystemEventsService](../../apps/api/src/domains/whatsapp/application/services/system-events.service.ts#L182) preserves sending policy, chooses the latest captured session, renders `invoice.total`, and catches send errors.                                                                                                                                                                           | A delayed or partial capture can produce invoice-total/latest-session content instead of the particular captured payment. Resolution does not establish delivery or a recorded policy skip. |
| Payment → staff inbox               | [Listener](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts#L94) uses invoice total for message text and includes capture identity in data. [StaffNotificationService](../../apps/api/src/domains/whatsapp/application/services/staff-notification.service.ts#L57) preserves tier/recipient policy but ignores rejected `allSettled` results. [Inbox service](../../apps/api/src/domains/whatsapp/application/services/staff-notification-inbox.service.ts#L210) creates a new row and catches persistence errors. | Replays can create duplicate inbox rows; recipient failures can be logged while the outbox event is acknowledged.                                                                           |
| WhatsApp acceptance → local receipt | [SendMessageUseCase](../../apps/api/src/domains/whatsapp/application/use-cases/send-message.use-case.ts#L73) calls the provider before conversation/message persistence. [Message creation](../../apps/api/src/domains/whatsapp/core/entities/whatsapp-message.entity.ts#L48) allocates a fresh identity. [Repository](../../apps/api/src/domains/whatsapp/infrastructure/repositories/prisma-whatsapp-message.repository.ts#L55) upserts by that identity and does not persist request metadata.                                                      | Provider acceptance followed by local failure leaves an uncertain outcome. Retrying can send another message. A local row is not evidence of handset delivery.                              |
| Provider contract                   | [WhatsApp client port](../../apps/api/src/domains/whatsapp/application/ports/whatsapp-client.port.ts#L10) returns an external message ID; it has no send idempotency or acceptance-reconciliation method.                                                                                                                                                                                                                                                                                                                                              | Adding a deterministic local ID alone cannot guarantee exactly one provider send.                                                                                                           |

These are source-confirmed limitations, not a demonstrated absence of the current compiled payment listener. The [existing listener tests](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.spec.ts#L201) explicitly preserve best-effort error handling and absent-invoice behavior. The [relay tests](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.spec.ts#L104) verify pending async work, late rejection, timeout, and successful acknowledgment. They do not establish end-to-end payment receipt delivery.

## Freeze delivery decision

On 13 October 2026 the user selected **keep payment WhatsApp receipts and staff
notifications best effort; record the limitation**. For this freeze, successful
payment capture does not guarantee either notification. Existing consent, tier,
recipient and error-handling policies remain in effect. Outbox acknowledgment is
not notification-delivery evidence; provider acceptance is not handset delivery.
The uncertainty and capture-content limitations in the table above remain
accepted limitations, not promises of durable or exactly-once delivery. No new
listener, delivery ledger, automatic retry or historical replay is introduced.

## Decisions required for a future required-delivery change

If required delivery is proposed after the freeze, the billing owner and notification owner must record these choices before claiming durable required effects:

1. Which effects are required: patient confirmation, staff inbox, both, or best effort. Define when consent, tier policy, missing recipients, and missing phone numbers are terminal recorded skips.
2. What to do after unknown provider acceptance or acceptance followed by local persistence failure: reconcile, hold for operator review, or retry with an explicitly accepted duplicate risk. Preserve consent and tenant checks in every recovery path.
3. Which payment a receipt describes: the specific captured amount, currency, provider payment ID and paid time, including partial captures and subsequent captures on the same invoice.
4. How long per-recipient effect identity survives notification deletion and data retention, and which historical events are eligible for recovery.

Simply registering another listener or propagating every existing error would change the delivery policy and can duplicate accepted WhatsApp messages. Historical outbox events must remain untouched until an approved recovery query identifies their actual effect status.

## Implementation options using existing ledgers

- Keep [OutboxEvent](../../packages/db/prisma/schema.prisma#L5249) as the transactional event/retry ledger. Its producer key and `processedAt` are event-level evidence; required effects need completion or policy-skip evidence before acknowledgment.
- Reuse [StaffNotification](../../packages/db/prisma/schema.prisma#L2024) for durable inbox effects. A stable, tenant-scoped identity derived from payment, effect kind and recipient can support an upsert once retention/deletion semantics are agreed. The current random row identity and JSON data do not provide that guarantee.
- Evaluate [WhatsappMessage](../../packages/db/prisma/schema.prisma#L2727) and [WhatsappLog](../../packages/db/prisma/schema.prisma#L1810) as existing outbound receipt stores. The latter already has payment/invoice correlation and delivery timestamps. Neither currently supplies a unique payment-effect identity. Any required sending path needs durable intent before provider invocation plus an explicit uncertain-outcome policy; adding another ledger or treating provider acceptance as delivery is insufficient.
- Keep [WebhookReplayDedupe](../../packages/db/prisma/schema.prisma#L5217) limited to its existing short-lived ingress replay role. Its expiry cannot establish permanent outbound-effect completion.

After the decisions, validate the selected consumer through an actual worker Nest bootstrap with external effects isolated, then test repeated delivery, per-recipient failure, provider acceptance followed by persistence failure, policy skips, and capture-specific content. A provider sandbox check remains a separate release gate. Do not change historical `processedAt` values to manufacture success.

## Local verification

After building the worker, run:

```sh
pnpm --filter @docita/worker run check:runtime
pnpm --filter @docita/api exec jest --runInBand \
  src/domains/whatsapp/application/listeners/whatsapp-event.listener.spec.ts \
  src/shared/modules/outbox/outbox-relay.scheduler.spec.ts
```

The runtime regression and all 22 listener/relay tests passed on 2026-10-13. The runtime process used synthetic configuration and ordinary Node resolution. Full worker bootstrap and isolated provider validation remain release evidence. Historical-event disposition is required only before an explicitly authorized recovery; the selected best-effort policy does not authorize replay.
