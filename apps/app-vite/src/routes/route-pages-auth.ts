import { lazy } from "react";

/* Auth (public) pages */
export const AuthPageContainer = lazy(() =>
  import("@/features/auth/components/AuthPageContainer").then((m) => ({ default: m.AuthPageContainer })),
);
export const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/pages/forgot-password").then((m) => ({ default: m.ForgotPasswordPage })),
);
export const ResetPasswordPage = lazy(() =>
  import("@/features/auth/pages/reset-password").then((m) => ({ default: m.ResetPasswordPage })),
);

/* Setup (auth required, no clinic) pages */
export const ChoosePathPage = lazy(() =>
  import("@/features/setup/pages/choose-path").then((m) => ({ default: m.ChoosePathPage })),
);
export const ClinicSelectionPage = lazy(() =>
  import("@/features/setup/pages/clinic-selection-page").then((m) => ({ default: m.ClinicSelectionPage })),
);
export const JoinClinicPage = lazy(() =>
  import("@/features/setup/pages/join-clinic-page").then((m) => ({ default: m.JoinClinicPage })),
);
export const JoinRequestStatusPage = lazy(() =>
  import("@/features/setup/pages/join-request-status-page").then((m) => ({ default: m.JoinRequestStatusPage })),
);
export const OnboardingPage = lazy(() =>
  import("@/features/setup/pages/onboarding-page").then((m) => ({ default: m.OnboardingPage })),
);
export const VerifyDoctorPage = lazy(() =>
  import("@/features/setup/pages/verify-doctor-page").then((m) => ({ default: m.VerifyDoctorPage })),
);

/* Verify-email + signature upload (setup-adjacent) pages */
export const VerifyEmailPage = lazy(() =>
  import("@/features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifyEmailPage })),
);
export const VerifyEmailSentPage = lazy(() =>
  import("@/features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifyEmailSentPage })),
);
export const VerifiedPage = lazy(() =>
  import("@/features/verify-email/pages/verify-email-page").then((m) => ({ default: m.VerifiedPage })),
);
export const UploadSignatureTokenPage = lazy(() =>
  import("@/features/upload-signature/pages/upload-signature-page").then((m) => ({ default: m.UploadSignatureTokenPage })),
);
export const UploadSignatureOnboardingPage = lazy(() =>
  import("@/features/upload-signature/pages/upload-signature-page").then((m) => ({ default: m.UploadSignatureOnboardingPage })),
);
