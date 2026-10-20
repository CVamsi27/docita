import { lazy } from "react";

/* Public booking / mobile upload */
export const BookingPage = lazy(() =>
  import("@/features/public-booking/pages/public-booking-page").then((m) => ({
    default: m.PublicBookingPageRoute,
  })),
);
export const MobileUploadPage = lazy(() =>
  import("@/features/mobile-upload/pages/mobile-upload-page").then((m) => ({ default: m.MobileUploadPage })),
);

/* Referral partner portal */
export const PartnerHomePage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerHomePage })),
);
export const PartnerLoginPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerLoginPage })),
);
export const PartnerDashboardPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerDashboardPage })),
);
export const PartnerBankingPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerBankingPage })),
);
export const PartnerPayoutsPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerPayoutsPage })),
);
export const PartnerReferralsPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerReferralsPage })),
);
export const PartnerSharePage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerSharePage })),
);
export const PartnerSubmitLeadPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({ default: m.PartnerSubmitLeadPage })),
);
// My submissions: the read-side of the facility-lead flow.
export const PartnerMySubmissionsPage = lazy(() =>
  import("@/features/referral-partner/pages/partner-pages").then((m) => ({
    default: m.PartnerMySubmissionsPage,
  })),
);
