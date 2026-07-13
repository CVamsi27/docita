# UI/UX Audit &mdash; 2026-07-13

Phase 2 of the four-phase UI/UX uplift for the doctor app.

This is a per-feature audit of the nine focus surfaces the user named
(login, onboarding, today, appointments, patients list, patients
detail, consultation list, consultation detail, settings, upgrade,
whatsapp) against the per-feature checklist in
[`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) §9
and the Origin-style IA in §1.

## Headline

The codebase is in **excellent shape** on the mechanical checks. The
UI standard is well-adopted, primitives are reused from
`@workspace/ui`, and the e2e coverage is real (not stubs). The bulk
of remaining work is **UX-level polish and doctor-time-saved
improvements**, not mechanical fixes.

## Mechanical checks &mdash; all clean

Ran these greps across `apps/app/src`, `apps/app/features`,
`apps/app/app`, `apps/app/shared`:

| Check | Result |
| --- | --- |
| `transition-all` in app code | 0 hits |
| `animate-pulse` on chrome | 0 hits |
| `animate-in fade-in slide-in-from-bottom-*` | 0 hits |
| `text-[Npx]` (non-token font sizes) | 0 hits |
| `window.alert / window.confirm / window.prompt` | 0 hits |
| Raw `#xxxxxx` hex colors in app code | 0 hits |
| Raw `rgba(` / `rgb(` colors | 0 hits |
| Native `title=` attribute (should be `SymbolTooltip`) | 0 hits |
| Bare `<input type="date">` (should be `IsoDatePickerField`) | 0 hits |
| Bare `<select>` (should be `Select` primitive) | 0 hits |
| `Skeleton animation="wave"` | 0 hits |
| Tier numeric comparison (`>= Tier.X`) | 0 hits |
| `console.log / console.error` | 0 hits (logger used) |
| App-local duplicates of `EmptyState` / `BackButton` / `DataState` | 0 hits (the `BackButton` in `apps/app/shared/components/navigation/back-button.tsx` is a legitimate thin wrapper that adds `useBackNavigation` fallback handling around the shared primitive) |
| `TODO` / `FIXME` / `XXX` comments in focus features | 0 hits |

## Per-feature §9 checklist status

For each focus surface, the §9 checklist asks:
- [x] Page uses `AppPageScaffold` + `PageHeader` (or `PageTabs`)
- [x] Loading/error/empty via `DataState` at page level
- [x] No motion-policy violations
- [x] Sidebar entry in the correct section (TRACK or SERVICES) and matches palette
- [x] Ask AI affordance present where the AI surface contract requires it
- [x] Mobile: chrome trailing cluster reachable
- [x] Playwright spec covers items 1&ndash;5 in §7 (and §7.6 if AI surface)
- [x] No raw hex; all colors via tokens
- [x] No app-local duplicates of `@workspace/ui` primitives

### Login &amp; Forgot password

- `apps/app/app/(auth)/login/page.tsx` &rarr; `AuthPageContainer` &rarr; `PreDashboardShell` + step UI.
- Uses `BackEmailField`, `SymbolTooltip`, `ErrorBanner`, floating-label `Input` per standard.
- 4-step pre-dashboard shell with `STEP_META` (account setup &rarr; email verification &rarr; choose path &rarr; facility setup).
- e2e: `auth.spec.ts` (3 tests), `forgot-password.spec.ts`, `reset-password.spec.ts`, `mobile-auth-setup.spec.ts`, `smart-auth.spec.ts` &mdash; real coverage.
- **No deltas found.**

### Onboarding

- `apps/app/features/onboarding/components/ChoosePathPageContent.tsx` + `JoinClinicPageContent.tsx` + `VerifyDoctorPageContent.tsx` + `UploadSignatureOnboardingPageContent.tsx` + `JoinRequestStatusPageContent.tsx`.
- Uses `typedApi`, `logger`, `showUserFacingErrorToast`, `PageTransitionLoader` &mdash; clean error path.
- Wizard composes `wizard/` + `steps/` + `use-clinic-registration-form`.
- e2e: `onboarding-join-clinic.spec.ts`, `verify-doctor.spec.ts`, `clinic-registration.spec.ts` &mdash; real coverage.
- **No deltas found.**

### Today (`/today`)

- `TodayPageContent` &rarr; `TodayPageHeader` + `TodayWorkspaceLayout` + `TodayBottomBarSection`.
- `DataState` covers loading, error, and new-clinic empty.
- `BottomActionBar` with **"Next patient"** primary CTA + **"View queue"** secondary &mdash; exactly the doctor-first UX the user asked for. (Phase 3 candidate: extend to also show who's next when a patient is in-room.)
- Ask AI affordance present in `PageHeader` actions (`data-testid="today-ask-ai"`).
- e2e: `today.spec.ts` covers PageHeader, queue visibility, Ask AI overlay.
- **No deltas found in Phase 2 scope.**

### Appointments (`/appointments`)

- `AppointmentsPageContent` &rarr; `AppointmentsPageContentBody` (calendar + list).
- `FeatureGate` for tier-locked features, `Suspense` boundary, `DataState` for loading.
- Doctor-delay dialog wired.
- e2e: `appointments.spec.ts` (5 tests) including inline follow-up dropdown.
- **No deltas found.**

### Patients list (`/patients`)

- `PatientsPageContent` &rarr; `PatientsPageUI` &rarr; `PatientsTable` (uses shared `DataTable` + `SortableHeader` + `PatientMobileCard`).
- Search via `DebouncedSearchInput` (not raw input).
- `DataState` for loading / error / empty (only shows empty when no search + no patients).
- e2e: `patients.spec.ts` (5+ tests), `patient-history-crud.spec.ts`, `patients-shell.spec.ts`, `mobile-forms.spec.ts`.
- **Real gap (Phase 3 candidate)**: patient rows don't show last-visit / next-visit date. Doctor has to open the patient to see when they were last seen. **Requires API change** &mdash; `Patient` type would need `lastVisitAt` / `nextVisitAt` fields, or the list would need a parallel fetch.

### Patients detail (`/patients/[id]`)

- `PatientDetailPageClient` &rarr; `PatientDetailPageContent` &rarr; `PatientDetailTabs` + `PatientFaceSheetHeader` + `PatientHeaderActions` + `PatientAdvisorRail`.
- `DataState` for loading, error, not-found, and access-denied (4 explicit branches).
- Ask AI affordance scoped to the patient (`openOverlay({ id: "patient:<id>", label: "on <name>" })`).
- e2e: `patients-shell.spec.ts`, `patient-history-crud.spec.ts`, mobile specs.
- **No deltas found.**

### Consultation list (`/consultation`)

- `ConsultationDashboardUI` &rarr; `ConsultationDashboardSections` (`ConsultationDashboardHeader` + `ConsultationDashboardStats` + `DoctorNextSection` + `NursePrepSection` + queue rows).
- `DataState` for loading and error.
- `AppointmentRowActionsMenu` for per-row actions.
- Stat grid with `scheduled / waiting / active / completed` &mdash; clear at-a-glance counts.
- e2e: `consultation.spec.ts` (6+ tests) covering start, leave dialog (3 variants), sidebar leave, scoped Ask AI.
- **No deltas found.**

### Consultation detail (`/consultation/[id]`)

- `ConsultationDetailPageContent` &rarr; 4 explicit branches (loading, error, access-denied, not-found) + main content.
- Header has: nav controls, patient summary, **toolbar with vitals / billing / command palette / Ask AI / Mark done**.
- Leave dialog with **dirty-draft detection** (3 navigation paths: save-and-leave, leave-without-saving, sidebar leave).
- Ask AI overlay scoped to the consultation.
- e2e: `consultation.spec.ts` covers full flow.
- **No deltas found.**

### Settings (`/settings`)

- `SettingsPageClient` &rarr; `SettingsPageUI` with custom 2-column layout (sidebar + panels).
- Uses `BackButton` wrapper (composes shared primitive), `Tabs` from `@workspace/ui`.
- 4 legacy tab redirects: `join-requests` &rarr; `/settings/team/join-requests`, `compliance` &rarr; `/settings/compliance`, `whatsapp-sender` &rarr; `/settings/whatsapp-sender`. All correct per IA.
- `PaymentSuccessModal` for billing flow.
- e2e: `settings.spec.ts` (4 tests), `subscription-billing.spec.ts`.
- **Minor delta**: `SettingsPageUI` uses a custom header composition (inline `<h1 className="ui-page-title">` + `ui-eyebrow` + `BackButton` slot) instead of the `PageHeader` primitive. This is intentional &mdash; the 2-column layout (title + user meta) is hard to express in `PageHeader` without changes to the primitive. Not a violation; flagging for a future primitive pass.

### Upgrade (`/upgrade`)

- `apps/app/app/(protected)/upgrade/page.tsx` is a 1-line `redirect("/settings?tab=subscription")` &mdash; matches the IA rule in `UI_UX_STANDARD_2026.md` §1.1.
- e2e: `upgrade-redirect.spec.ts` asserts the redirect.
- **No deltas found.**

### WhatsApp (`/whatsapp`)

- `WhatsappOperationsPageContent` &rarr; 4 `PageTabs`: Sent, Campaigns, Templates, Delivery.
- `PageHeader` with admin-only "Manage sender" link to `/settings/whatsapp-sender`.
- Uses `WhatsappTemplatesSettings` (shared with Settings).
- e2e: `whatsapp.spec.ts` (2 tests), `whatsapp-workflows` page exists.
- **No deltas found.**

## Phase 3 candidates (UX wins, ordered by impact)

These are the real doctor-time-saved improvements surfaced by the
audit. Each one would land in a Phase 3 PR.

1. **Patients list: last-visit / next-visit column** &mdash; one
   glance shows who the doctor is about to see and who they last
   saw. Requires API change to expose the dates. (Highest impact for
   the daily list-scan workflow.) **Spec-only for now &mdash; see
   `docs/audits/UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md` for
   the full multi-layer plan (schema migration + API + contract +
   UI + backfill). Not landed in this pass because the change is
   too large for a session-end commit.**
2. **Today page: "next patient" stays visible while a consultation
   is in progress** &mdash; the current `BottomActionBar` disappears
   when `hasCurrentPatient`. A persistent "Next: <name>" pill would
   let the doctor see who's next without opening the queue. **Done
   in the next commit on this branch &mdash; see
   `feat(today): persistent next-patient preview while in consult`.**
3. **Appointments: slot click opens a contextual action menu** &mdash;
   reschedule, cancel, mark arrived, start consult. Right now it's
   one row, one action; in practice the doctor needs all four.
4. **WhatsApp: "send template" sheet pre-scoped to the patient when
   opened from a patient detail page** &mdash; one click instead of
   three (open patient &rarr; open WhatsApp &rarr; pick patient
   &rarr; pick template).
5. **Onboarding end-of-wizard "here's your day" overlay** &mdash; a
   30-second `GuidedTourLauncher` run that points at Today, the
   queue, and the first action. (The `GuidedTourLauncher` primitive
   already exists; the wiring is what would change.)
6. **Consultation: a "Quick actions" floating cluster (Prescribe /
   Lab / Complete)** that doesn't move with scroll &mdash; frees up
   header real estate. (Worth a design pass before code.)

## Files touched by this audit

None. This commit is a findings document only. Phase 3 PRs will touch
the corresponding feature files.

## Verification

This audit was a read-only pass. No code was modified. No build
artifacts were generated. The audit doc is the only deliverable.
