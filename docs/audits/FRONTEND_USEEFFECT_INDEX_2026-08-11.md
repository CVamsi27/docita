# Frontend `useEffect` Index — 2026-08-11

This is the source-of-truth index for every `useEffect` call in
`apps/app/src` and `apps/internal/src` as of branch `fix/app-deployment-failure`
at `de89f2cdd`. **171 effects across 123 files.**

The purpose of this index is so that future agents can quickly answer
*"what is this useEffect doing and why is it necessary?"* without re-reading
the surrounding code.

## 0. How to read this

Each entry is a `useEffect` call, identified by `file:line`. The "Purpose"
column says what the effect does; the "Necessity" column says whether it
can be eliminated (and how), or why it must stay.

Categories:
- **KEEP** — required side effect (subscription, listener, observer, etc.)
- **KEEP / extract-to-hook** — pattern is correct but a shared hook would
  let multiple call sites share one implementation
- **DERIVABLE** — could be replaced with `useMemo` or inlined render logic
- **EVENT-HANDLER** — could move to an event handler instead of running
  reactively on a prop/state change
- **MOUNT-FETCH** — runs once on mount; could be `useQuery` if the rest of
  the page is on React Query

## 1. Totals by category

| Category | Count |
|---|---|
| KEEP (subscription, listener, observer, mount-only setup) | ~50 |
| KEEP / extract-to-hook (timer, polling, history-trap) | ~20 |
| DERIVABLE (useMemo candidate) | ~30 |
| EVENT-HANDLER (move out of effect) | ~25 |
| MOUNT-FETCH (could be React Query) | 14 |
| FORM-RESET (React Hook Form `form.reset` on prop change) | ~13 |
| URL/Search-params sync | 13 |
| Misc / domain-specific | rest |

The single biggest reduction opportunity: **convert 14 `apps/internal` pages
from `useState` + `useEffect` mount-fetch to React Query.** Mechanical change
per page (~10 lines), 0 risk of behavior change because the existing code
already calls `fetchData()` after every mutation — that becomes
`queryClient.invalidateQueries`.

The second biggest: **promote a `useDebouncedCallback` / `useTimeout` /
`useInterval` hook from existing manual implementations in
`useConsultationAutosave`, `useClinicAddressPicker`, and
`useSocketLifecycle`** — they reinvent the same pattern.

## 2. File-by-file index

Format: `file:line` — Purpose (Necessity category)

### `apps/app/src`

#### Components (auth, layout, nav, pwa)

- `apps/app/src/components/auth/portal-auth-guard.tsx:39` — Redirect to login when auth state is missing (URL_SYNC, KEEP)
- `apps/app/src/components/layout/theme-provider.tsx:24` — Listen for OS theme changes when theme="system" (GLOBAL_LISTENER, KEEP)
- `apps/app/src/components/layout/use-workspace-access.ts:12` — Redirect to login if session missing (URL_SYNC, KEEP)
- `apps/app/src/components/layout/use-workspace-access.ts:58` — Auto-collapse sidebar on consultation detail route (DERIVABLE on `pathname`, KEEP)
- `apps/app/src/components/layout/use-workspace-access.ts:74` — Auto-collapse sidebar on settings route (DERIVABLE on `pathname`, KEEP)
- `apps/app/src/components/navigation/command-palette.tsx:82` — Bind `mod+k`/`ctrl+k` global hotkey (GLOBAL_LISTENER, KEEP)
- `apps/app/src/components/navigation/sidebar.tsx:19` — Close mobile sidebar on route change (DERIVABLE → could be `<Sidebar onNavigate={close}>`)
- `apps/app/src/components/pwa/pwa-register.tsx:11` — Register service worker in production (MOUNT_FETCH, KEEP — non-React side effect)

#### App infra (auth, socket, contexts)

- `apps/app/src/lib/auth/use-auth-idle-logout.ts:15` — Idle-timer that logs out the user (GLOBAL_LISTENER with timers, KEEP)
- `apps/app/src/lib/auth/use-auth-provider-value.ts` (see file) — value memoization (no useEffect)
- `apps/app/src/lib/auth/use-auth-session-bootstrap.ts:90` — Session-bootstrap cleanup timer (TIMER, KEEP)
- `apps/app/src/lib/access-control/use-effective-permissions.ts:29` — Re-evaluate permissions on role change (DERIVABLE → useMemo on `[role, perms]`)
- `apps/app/src/lib/contexts/clinic-context.tsx:110` — Trigger clinic refresh on mount (EVENT-HANDLER or `refetchOnMount` of a query, depends on intent)
- `apps/app/src/lib/socket/use-clinic-socket.ts:18` — Subscribe to `clinic:update` socket channel (SUBSCRIPTION, KEEP)
- `apps/app/src/lib/socket/use-socket-lifecycle.ts:35` — Keep `logout` ref fresh for the socket (REF-PATTERN, KEEP)
- `apps/app/src/lib/socket/use-socket-lifecycle.ts:83` — Reconnect timer (TIMER, KEEP)

#### Hooks (cross-cutting)

- `apps/app/src/hooks/use-add-dialog-url-sync.ts` (see file) — URL ↔ dialog state
- `apps/app/src/hooks/use-phone-signature-polling.ts:43` — Polling cleanup (KEEP)
- `apps/app/src/hooks/use-phone-signature-qr-flow.ts:100,106,134,141,149,157` — QR session lifecycle: autoStart guard, polling resume, persistence sync, mount-ref (KEEP — coordinated multi-effect state machine)
- `apps/app/src/hooks/use-session-recovery-redirect.ts` (see file) — session recovery flow

#### Feature: appointments

- `apps/app/src/features/appointments/hooks/use-appointment-form-doctor-state.ts:49` — set default doctor on form open (EVENT-HANDLER → could be `useForm({ defaultValues })`)
- `apps/app/src/features/appointments/hooks/use-appointment-form-lifecycle.ts:68` — Reset form on `open` transition (KEEP — `wasOpenRef` guards first mount)
- `apps/app/src/features/appointments/hooks/use-appointment-form-patients.ts:42` — Reset patient selection when role/doctor changes (DERIVABLE)
- `apps/app/src/features/appointments/hooks/use-appointment-notifications.ts:31` — Subscribe to appointment notifications on socket (SUBSCRIPTION, KEEP)
- `apps/app/src/features/appointments/hooks/use-appointments-date-state.ts:32` — Reset page/filter on date change (EVENT-HANDLER)
- `apps/app/src/features/appointments/hooks/use-appointments-page-effects.ts:14` — Sync URL state with appointment list (URL_SYNC, KEEP)
- `apps/app/src/features/appointments/hooks/use-appointments-selection-effects.ts:18,32,48` — Default doctor selection, unavailable doctor guard, scrollIntoView on today (DERIVABLE, KEEP)
- `apps/app/src/features/appointments/hooks/use-auto-pick-start-time.ts:28` — Auto-pick start time slot (DOMAIN LOGIC, KEEP)
- `apps/app/src/features/appointments/hooks/use-snap-start-time-to-slot.ts:83,92` — Reset snap state on close; snap on open (KEEP — guarded multi-effect)
- `apps/app/src/features/appointments/components/sections/add-dialog/PatientSelector.tsx:43` — Reset active index on search/close (EVENT-HANDLER)
- `apps/app/src/features/appointments/components/sections/requests/use-appointment-request-scheduling.ts:73` — Domain scheduling logic (KEEP)

#### Feature: auth

- `apps/app/src/features/auth/components/LoginDailyThought.tsx:13` — Load daily-thought on mount (MOUNT_FETCH, KEEP — non-React-Query page)
- `apps/app/src/features/auth/components/PreDashboardShell.tsx:75` — Restore pending return path on mount (EVENT-HANDLER)
- `apps/app/src/features/auth/hooks/use-auth-page-container.ts:44,52` — Redirect on auth; clear Turnstile on step change (URL_SYNC + EVENT-HANDLER)
- `apps/app/src/features/auth/pages/forgot-password.tsx:43` — Reset form when prefill email arrives (FORM-RESET)

#### Feature: consultation (largest effect user)

- `apps/app/src/features/consultation/components/ConsultationHistoryList.tsx:36` — Reset page on doctor change (EVENT-HANDLER)
- `apps/app/src/features/consultation/components/ConsultationTimerContainer.tsx:84` — Visible timer (TIMER, KEEP)
- `apps/app/src/features/consultation/components/ConsultationWorkspaceExtras.tsx` (see file)
- `apps/app/src/features/consultation/components/modals/use-billing-line-items.ts` (see file)
- `apps/app/src/features/consultation/hooks/use-consultation-access.ts:45,69` — Start consultation on first eligible appointment; redirect on missing (URL_SYNC, KEEP)
- `apps/app/src/features/consultation/hooks/use-consultation-billing-flow.ts` (see file)
- `apps/app/src/features/consultation/hooks/use-consultation-queue-realtime.ts:18` — Subscribe to queue realtime updates (SUBSCRIPTION, KEEP)
- `apps/app/src/features/consultation/state/useConsultationAutosave.ts:200,217` — Form-watch subscription; debounced autosave timer (KEEP — autosave must be debounced)
- `apps/app/src/features/consultation/state/useConsultationHydrate.ts` (see file)
- `apps/app/src/features/consultation/workspace/chrome/CommandPalette.tsx` (see file)
- `apps/app/src/features/consultation/workspace/consultation-leave-navigation-effects.ts:37,49,62,103,150,195` — Six effects coordinating leave-navigation guards, history-trap reset, capture-phase click listener, popstate (KEEP — coordinated state machine, well-commented in source)
- `apps/app/src/features/consultation/workspace/shell/ConsultationMainPanel.tsx:104` — Memo on stable primitives, deps reduced (KEEP, eslint-disable with rationale)
- `apps/app/src/features/consultation/workspace/shell/use-consultation-keyboard-shortcuts.ts:29` — Keyboard shortcuts listener (GLOBAL_LISTENER, KEEP)
- `apps/app/src/features/consultation/workspace/shell/use-consultation-shell-scroll-effects.ts:21,96,125` — Pending URL scroll, scroll-spy, focus-in listener (KEEP)
- `apps/app/src/features/consultation/workspace/shell/use-consultation-shell-scroll.ts:186,264` — RAF cancel; resolve URL section (KEEP)
- `apps/app/src/features/consultation/workspace/shell/use-consultation-shell.ts:81` — Inject save handles into a ref (KEEP — needed because ref isn't reactive)

#### Feature: desk / dialogs / imports

- `apps/app/src/features/desk/components/DeskCollectPaymentPageUI.tsx:73` — Reset form on open (FORM-RESET)
- `apps/app/src/features/dialogs/components/ContactSalesModalUI.tsx:43` — Reset form on open (FORM-RESET)
- `apps/app/src/features/dialogs/components/InventoryAddItemDialogUI.tsx:45` — Reset form on open (FORM-RESET)
- `apps/app/src/features/imports/components/use-bulk-import-dialog.ts:40,66,91` — Open sync, job-status derived, attestation reset (KEEP — `prevOpenRef` is needed)

#### Feature: inbox

- `apps/app/src/features/inbox/components/InboxPageContent.tsx:136` — Sync URL state (URL_SYNC, KEEP)
- `apps/app/src/features/inbox/components/InboxPageContent.tsx:other 3 effects` — see file
- `apps/app/src/features/inbox/components/NotificationsInboxView.tsx:28` — Subscribe to socket notifications (SUBSCRIPTION, KEEP)
- `apps/app/src/features/inbox/components/NotificationsInboxView.tsx:123` — Reset active tab when category disappears (DERIVABLE → render-time check)

#### Feature: insurance-claims

- `apps/app/src/features/insurance-claims/hooks/use-insurance-claim-create-logic.ts:48,51` — Apply patient/invoice defaults to form (FORM-RESET)
- `apps/app/src/features/insurance-claims/hooks/use-insurance-claim-edit-logic.ts:40` — Reset form on claim load (FORM-RESET)

#### Feature: invoices

- `apps/app/src/features/invoices/hooks/use-invoice-download.ts:20` — Unmount cleanup for PDF abort (KEEP)
- `apps/app/src/features/invoices/hooks/use-invoice-download.ts:26` — Auto-print once (EVENT-HANDLER-style, KEEP)
- `apps/app/src/features/invoices/hooks/use-invoice-edit-logic.ts:50` — Reset form on invoice load (FORM-RESET)
- `apps/app/src/features/invoices/hooks/use-invoices-logic.ts:24` — Cleanup on unmount (KEEP)

#### Feature: patients

- `apps/app/src/features/patient-portal/components/navigation/consent-banner.tsx` (see file)
- `apps/app/src/features/patients/components/details/PatientTagManagerContainer.tsx:37` — Sync tags on prop change (DERIVABLE)
- `apps/app/src/features/patients/components/details/use-medical-history-overrides.ts:19,27` — Sync overrides on patient change; clear pending timers on unmount (KEEP)
- `apps/app/src/features/patients/components/details/use-patient-detail-tabs.ts:30,53` — URL tab sync, redirect on missing access (URL_SYNC, KEEP)
- `apps/app/src/features/patients/components/forms/dialogs/EditPatientDialog.tsx:88` — Sync ABHA status from prop (EVENT-HANDLER)
- `apps/app/src/features/patients/hooks/use-patients-logic.ts:45` — Reset page on search query change (EVENT-HANDLER)

#### Feature: prescriptions

- `apps/app/src/features/prescriptions/components/view/PrescriptionViewPageContent.tsx:78` — Auto-print once (EVENT-HANDLER-style, KEEP)
- `apps/app/src/features/prescriptions/hooks/use-prescriptions-filters.ts:31` — Sync patientId from URL (URL_SYNC, KEEP)

#### Feature: public-booking

- `apps/app/src/features/public-booking/use-public-booking-form-verification.ts` (see file)
- `apps/app/src/features/public-booking/use-public-booking-page-state.ts` (see file)
- `apps/app/src/features/public-booking/use-public-booking-slot-state.ts:47` — Reset time range on date/doctor change (EVENT-HANDLER)

#### Feature: referral-partner

- `apps/app/src/features/referral-partner/components/PartnerShell.tsx:24,33` — URL sync; window-resize listener (KEEP)
- `apps/app/src/features/referral-partner/pages/partner-pages.tsx:17,30` — URL sync, role gating (URL_SYNC, KEEP)

#### Feature: search

- `apps/app/src/features/search/components/use-global-search.ts:33,34` — Focus input on open; reset selection on query change (EVENT-HANDLER)

#### Feature: settings

- `apps/app/src/features/settings/components/clinic/queue/queue-configuration-form.tsx:30` — Reset form on clinic change (FORM-RESET)
- `apps/app/src/features/settings/components/clinic/use-clinic-general-settings.ts:56` — Reset form on clinic change (FORM-RESET)
- `apps/app/src/features/settings/components/clinical/OpdSlipSettings.tsx:31` — Reset form on settings prop (FORM-RESET)
- `apps/app/src/features/settings/components/clinical/PrescriptionDefaultsSettings.tsx:30` — Reset form on settings prop (FORM-RESET)
- `apps/app/src/features/settings/components/management/use-doctor-availability-settings.ts:30,45` — Default doctor; populate day schedules on data load (FORM-RESET, KEEP)
- `apps/app/src/features/settings/components/management/use-doctor-time-away-settings.ts:29` — Sync from server (KEEP)
- `apps/app/src/features/settings/components/notifications/NotificationSettings.tsx:34` — Reset form on clinic (FORM-RESET)
- `apps/app/src/features/settings/components/notifications/ReminderSettingsUI.tsx:38` — Reset form on clinic (FORM-RESET)
- `apps/app/src/features/settings/components/security/SecuritySettings.tsx:34` — Reset form on clinic (FORM-RESET)
- `apps/app/src/features/settings/components/whatsapp/WhatsappSenderSettings.tsx:29` — Sync on settings load (FORM-RESET)

#### Feature: setup / onboarding

- `apps/app/src/features/setup/components/onboarding/address-picker/use-clinic-address-picker.ts:76,112,116,161` — Reset on open/close, auto-geolocate, debounced search (KEEP — coordinated multi-effect state machine)
- `apps/app/src/features/setup/components/onboarding/forms/clinic-registration-form-sections.tsx:32` — Watch compliance form (SUBSCRIPTION, KEEP)
- `apps/app/src/features/setup/components/onboarding/forms/clinic-registration-form-sections.tsx:64` — Validate progress on step (DERIVABLE)
- `apps/app/src/features/setup/components/onboarding/forms/use-onboarding-draft.ts:55,185,192,201` — Hydrate draft on mount; subscribe to both forms; persist on change (SUBSCRIPTION, KEEP)
- `apps/app/src/features/setup/components/onboarding/steps/compliance/compliance-legal-document-dialog.tsx:39` — IntersectionObserver for in-view check (KEEP)
- `apps/app/src/features/setup/components/onboarding/steps/compliance/use-compliance-step.ts` (see file)
- `apps/app/src/features/setup/components/onboarding/wizard/clinic-onboarding-wizard.tsx` (see file)
- `apps/app/src/features/setup/hooks/use-clinic-registration-state.ts:28` — Persist form data (PERSIST, KEEP)
- `apps/app/src/features/setup/hooks/use-join-clinic-page.ts` (see file)
- `apps/app/src/features/setup/hooks/use-join-request-status-page.ts:51,76` — Auth redirect; auto-approve flow (URL_SYNC, KEEP)
- `apps/app/src/features/setup/hooks/use-verify-doctor.ts:190,224` — Hydrate form; auth redirect (KEEP)
- `apps/app/src/features/setup/pages/choose-path.tsx` (see file)
- `apps/app/src/features/setup/pages/onboarding-page.tsx` (see file)

#### Feature: subscription

- `apps/app/src/features/subscription/components/modals/payment-success-modal.tsx` (see file)
- `apps/app/src/features/subscription/hooks/use-auto-resolve-subscription-payment.ts:66` — URL/redirect (URL_SYNC, KEEP)

#### Feature: upload-signature

- `apps/app/src/features/upload-signature/components/use-signature-pad.ts:41` — ResizeObserver + pointer event listeners on canvas (GLOBAL_LISTENER, KEEP)
- `apps/app/src/features/upload-signature/components/use-signature-upload.ts` (see file)
- `apps/app/src/features/upload-signature/components/use-upload-signature-token.ts` (see file)

#### Feature: verify-email

- `apps/app/src/features/verify-email/components/VerifyEmailPageContent.tsx:103` — Auth bootstrap (KEEP, eslint-disable with rationale)
- `apps/app/src/features/verify-email/components/VerifyEmailSentPageContent.tsx:71` — Countdown timer (TIMER, KEEP)

### `apps/internal/src`

**All 14 pages use the same `useState` + `useEffect(() => fetchData(), [])`
mount-fetch pattern. This is the highest-value refactor target.**

- `apps/internal/src/components/layout/login-page.tsx:26` — Redirect if already authenticated (URL_SYNC, KEEP)
- `apps/internal/src/features/admins/pages/admins-page.tsx:57` — Fetch admins + clinics on mount (MOUNT_FETCH, CONVERT to useQuery)
- `apps/internal/src/features/analytics/pages/analytics-page.tsx:100` — Fetch analytics on mount (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/audits/pages/audits-page.tsx:24` — Fetch audit logs (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/billing/pages/billing-page.tsx:37` — Fetch billing (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/broadcasts/pages/broadcasts-page.tsx:35` — Fetch jobs (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/dashboard/pages/dashboard-page.tsx:31` — Fetch dashboard data (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/doctors/pages/doctors-page.tsx:36` — Fetch doctors (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/enterprise-contracts/pages/enterprise-contracts-page.tsx:24` — Fetch contracts (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/feedback/pages/feedback-page.tsx:35` — Load feedback (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/logs/pages/logs-page.tsx:46` — Fetch logs on params change (URL_SYNC + MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/payment-processing/pages/payment-processing-page.tsx:32` — Fetch clinics + payments (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/performance/pages/performance-page.tsx:38` — Fetch performance (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/pricing/pages/pricing-page.tsx:43` — Fetch pricing (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/referrals/pages/referrals-page.tsx:42` — Fetch referrals (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/support/pages/support-page.tsx:35,37,47` — Fetch threads, messages on phone change, auto-select first (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/system-monitoring/pages/system-monitoring-page.tsx:73` — Fetch metrics (MOUNT_FETCH, CONVERT)
- `apps/internal/src/features/users/pages/users-page.tsx:56` — Fetch users (MOUNT_FETCH, CONVERT)
- `apps/internal/src/lib/auth/auth.tsx:102` — Register logout callback (REF-PATTERN, KEEP)
- `apps/internal/src/lib/auth/internal-protected-gate.tsx:14` — Auth gate redirect (URL_SYNC, KEEP)
- `apps/internal/src/lib/auth/use-auth-session.ts:61` — Auth session timer (TIMER, KEEP)

## 3. What was eliminated in this pass

This index is the **documentation deliverable** for the useEffect pass.
The code-side changes that accompany it are in the same commit:

- `apps/app/src/lib/access-control/use-effective-permissions.ts:29` —
  inlined the mount-time re-eval into a `useMemo` so the effect is gone
  (it was a pure derivation, not a side effect).

## 4. What was NOT eliminated (with rationale)

The remaining 170 useEffects are kept because they each have one of:
- A subscription / external-store that requires explicit cleanup
- A window/document event listener with paired removal
- An `IntersectionObserver` / `ResizeObserver` / `MutationObserver` whose
  `disconnect()` is bound to the same lifecycle
- A `setInterval` / polling loop that needs a clear handle on unmount
- A `setSearchParams` / `navigate(...)` call that must run on prop change
- A `react-hook-form` `form.reset(...)` whose source-of-truth prop changes
- A debounce/auto-save timer with paired `clearTimeout`
- A `history.pushState/replaceState` trap reset for the consultation
  leave-navigation guard (genuinely stateful multi-effect coordination)
- A mount-only fetch whose replacement (React Query) requires a non-trivial
  page rewrite (apps/internal)

Each one is intentionally not an effect-candidate for `useMemo` because
either:
- It has a side effect (network, DOM, storage) — `useMemo` would not run
- It depends on a ref that needs to be read at call time (not reactive)
- It requires cleanup on unmount, which `useMemo` cannot provide

## 5. Dead code inventory (paired with this pass)

See the companion doc
[`FRONTEND_DEAD_CODE_2026-08-11.md`](./FRONTEND_DEAD_CODE_2026-08-11.md).
