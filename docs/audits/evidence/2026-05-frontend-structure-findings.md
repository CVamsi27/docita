# 2026-05 Frontend Structure Findings

| File | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| apps/app/app/(protected)/appointments/page.tsx | split | route page is 265 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(protected)/consultation/[id]/page.tsx | split | route page is 283 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(protected)/specialty/dental-charts/page.tsx | split | route page is 313 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(protected)/today/page.tsx | split | route page is 232 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/choose-path/page.tsx | split | route page is 226 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/join-clinic/page.tsx | split | route page is 327 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/join-request-status/page.tsx | split | route page is 340 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/upload-signature/[token]/page.tsx | split | route page is 216 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/upload-signature/onboarding/page.tsx | split | route page is 308 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/verify-doctor/page.tsx | split | route page is 665 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/verify-email-sent/page.tsx | split | route page is 320 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(setup)/verify-email/page.tsx | split | route page is 193 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(tools)/mobile-upload/[id]/page.tsx | split | route page is 221 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(tools)/visual-test/doctor-workflow/page.tsx | split | route page is 189 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/(tools)/visual-test/origin-primitives/page.tsx | split | route page is 189 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/portal/appointments/page.tsx | split | route page is 219 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/portal/page.tsx | split | route page is 224 lines; route files should compose feature components | split after characterization tests |
| apps/app/app/portal/profile/page.tsx | split | route page is 235 lines; route files should compose feature components | split after characterization tests |
| apps/app/components/common/auth/access-gates.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/bullet-step-list.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/buttons/button.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/buttons/index.ts | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/buttons/primary-button.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/dialogs/DeleteConfirmDialog.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/dialogs/DiscardChangesDialog.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/dialogs/confirm-dialog.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/dialogs/index.ts | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/enhanced-error-boundary.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/error-banner.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/error-boundary.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/form-field.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/i18n/language-switcher.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/inputs/index.ts | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/inputs/text-input.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/loaders/branded-page-loader.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/loaders/index.ts | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/loaders/page-transition-loader.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/loaders/spinner.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/loading-skeleton.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/monitoring/client-error-reporter.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/monitoring/sentry-initializer.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/navigation/back-button.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/pwa/pwa-register.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/support-contact.test.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/common/support-contact.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/index.ts | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/components/signature-canvas.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/app/features/_shared/components/ask-ai/ask-ai-overlay.tsx | split | component is 445 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/_shared/components/layout/web-vitals-reporter.tsx | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/_shared/components/navigation/notification-panel.tsx | split | component is 536 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/_shared/components/navigation/sidebar.tsx | split | component is 838 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/_shared/components/patient-history/VisitCard.tsx | split | component is 477 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/appointments/components/sections/AppointmentRequestsPanel.tsx | split | component is 1097 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/auth/components/LoginDailyThought.tsx | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/consultation/components/ConsultationDashboardUI.tsx | split | component is 420 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/consultation/components/modals/BillingModal.tsx | split | component is 426 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/consultation/workspace/ConsultationShell.tsx | split | component is 743 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/consultation/workspace/sections/index.tsx | split | component is 407 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/desk/components/DeskCollectPaymentPageUI.tsx | split | component is 421 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/documents/hooks/use-documents-logic.ts | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/inbox/components/NotificationsInboxView.tsx | split | component is 409 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/ocr/hooks/use-mobile-upload.ts | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/onboarding/components/clinic-address-picker-dialog.tsx | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/onboarding/components/clinic-address-picker-dialog.tsx | split | component is 1000 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/onboarding/components/forms/clinic-registration-form.tsx | split | component is 543 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/onboarding/components/steps/ClinicDetailsStep.tsx | split | component is 728 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/onboarding/components/steps/ComplianceStep.tsx | split | component is 853 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/onboarding/components/steps/PlanSelectionStep.tsx | split | component is 473 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/onboarding/components/steps/TeamInviteStep.tsx | split | component is 590 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/patients/components/details/PatientMetricsHistoryUI.tsx | split | component is 563 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/patients/components/details/PatientTagManagerUI.tsx | split | component is 519 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/patients/components/forms/PatientDialogs.tsx | split | component is 640 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/public-booking/public-booking-components.tsx | split | component is 1146 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/public-booking/public-booking-form-sections.tsx | split | component is 1375 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/search/api/search-api.ts | review | feature file calls fetch; client server state should use packages/data-access | review and either fix or document exception |
| apps/app/features/settings/components/clinic/ClinicGeneralSettings.tsx | split | component is 458 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/settings/components/compliance/ComplianceSettingsPanel.tsx | split | component is 663 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/settings/components/leave/LeaveManagementSettings.tsx | split | component is 798 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/settings/components/management/MemberManagementSettings.tsx | split | component is 529 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/billing-subscription-workspace.tsx | split | component is 747 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/billing/BillingHistoryTable.tsx | split | component is 508 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/cards/current-plan-card.tsx | split | component is 418 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/cards/tier-card.tsx | split | component is 495 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/dialogs/tier-change-dialog.tsx | split | component is 549 lines; split into sections/hooks | split after characterization tests |
| apps/app/features/subscription/components/pricing/comparison-table.tsx | split | component is 561 lines; split into sections/hooks | split after characterization tests |
| apps/internal/components/analytics/analytics-dashboard.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/analytics/analytics-detailed-metrics-table.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/audit/audit-log-viewer.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/common/back-button.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/internal-web-vitals-reporter.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/optional-sentry-initializer.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/sentry-initializer.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
| apps/internal/components/theme-toggle.tsx | move | app-level components are transitional; move to a feature, _shared, or packages/ui | review target folder and move behind index.ts re-export |
