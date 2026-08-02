/**
 * Route path constants for the Vite app.
 * Mirrors the Next.js app route groups so path changes stay in sync.
 *
 * Route groups:
 *   (auth)     - Public auth pages (login, forgot-password, reset-password)
 *   (setup)    - Post-auth setup pages (clinic selection, onboarding, verify-email)
 *   (protected)- Core clinical app (requires auth + clinic setup)
 *   (public)   - Truly public pages (partner portal, booking, mobile-upload)
 *   /portal    - Patient portal
 *   /lab-portal- Lab portal
 *   (tools)    - Dev-only tooling pages
 */

/* ── Auth ─────────────────────────────────────────────── */
export const LOGIN = "/login";
export const FORGOT_PASSWORD = "/forgot-password";
export const RESET_PASSWORD = "/reset-password";

export const AUTH_ROUTES = [LOGIN, FORGOT_PASSWORD, RESET_PASSWORD] as const;

/* ── Setup (post-auth, pre-clinic) ──────────────────── */
export const CHOOSE_PATH = "/choose-path";
export const CLINIC_SELECTION = "/clinic-selection";
export const JOIN_CLINIC = "/join-clinic";
export const JOIN_REQUEST_STATUS = "/join-request-status";
export const ONBOARDING = "/onboarding";
export const VERIFY_DOCTOR = "/verify-doctor";
export const VERIFY_EMAIL = "/verify-email";
export const VERIFY_EMAIL_SENT = "/verify-email-sent";
export const VERIFY_EMAIL_VERIFIED = "/verify-email/verified";
export const UPLOAD_SIGNATURE_TOKEN = "/upload-signature/:token";
export const UPLOAD_SIGNATURE_ONBOARDING = "/upload-signature/onboarding";

export const SETUP_ROUTES = [
  CHOOSE_PATH, CLINIC_SELECTION, JOIN_CLINIC, JOIN_REQUEST_STATUS,
  ONBOARDING, VERIFY_DOCTOR, VERIFY_EMAIL, VERIFY_EMAIL_SENT,
  VERIFY_EMAIL_VERIFIED, UPLOAD_SIGNATURE_TOKEN, UPLOAD_SIGNATURE_ONBOARDING,
] as const;

/* ── Protected (clinical app) ─────────────────────── */
export const TODAY = "/today";
export const DASHBOARD = "/dashboard";
export const CONSULTATION = "/consultation";
export const CONSULTATION_ID = "/consultation/:id";
export const APPOINTMENTS = "/appointments";
export const PATIENTS = "/patients";
export const PATIENTS_ID = "/patients/:id";
export const PRESCRIPTIONS = "/prescriptions";
export const PRESCRIPTIONS_ID = "/prescriptions/:id";
export const INVOICES = "/invoices";
export const INVOICES_NEW = "/invoices/new";
export const INVOICES_ID = "/invoices/:id";
export const INVOICES_ID_EDIT = "/invoices/:id/edit";
export const INSURANCE_CLAIMS = "/insurance-claims";
export const INSURANCE_CLAIMS_NEW = "/insurance-claims/new";
export const INSURANCE_CLAIMS_ID = "/insurance-claims/:id";
export const INSURANCE_CLAIMS_ID_EDIT = "/insurance-claims/:id/edit";
export const LAB_TESTS = "/lab-tests";
export const INVENTORY = "/inventory";
export const DOCUMENTS = "/documents";
export const PHARMACY = "/pharmacy";
export const SETTINGS = "/settings";
export const SETTINGS_TEAM = "/settings/team";
export const SETTINGS_TEAM_JOIN_REQUESTS = "/settings/team/join-requests";
export const SETTINGS_COMPLIANCE = "/settings/compliance";
export const SETTINGS_COMPLIANCE_CONSENT_TEMPLATE = "/settings/compliance/consent-template";
export const SETTINGS_WHATSAPP_SENDER = "/settings/whatsapp-sender";
export const WHATSAPP = "/whatsapp";
export const INBOX = "/inbox";
export const ANALYTICS = "/analytics";
export const REPORTS = "/reports";
export const CODING_QUEUE = "/coding-queue";
export const DAYBOOK = "/daybook";
export const DESK_COLLECT_PAYMENT = "/desk/collect-payment";
export const DESK_FLOOR = "/desk/floor";
export const HELP = "/help";
export const PROFILE = "/profile";
export const TEMPLATES = "/templates";
export const AI_ASSISTANT = "/ai-assistant";
export const BILLING_LOCKED = "/billing-locked";
export const UPGRADE = "/upgrade";
export const HOSPITAL_BEDS = "/hospital/beds";
export const REFERRALS = "/referrals";
export const SPECIALTY = "/specialty";
export const SPECIALTY_DENTAL_CHARTS = "/specialty/dental-charts";
export const FOLLOW_UPS = "/follow-ups";
export const IMPORTS = "/import";

/* ── Portal (patient portal) ───────────────────────── */
export const PORTAL = "/portal";
export const PORTAL_LOGIN = "/portal/login";
export const PORTAL_APPOINTMENTS = "/portal/appointments";
export const PORTAL_BILLING = "/portal/billing";
export const PORTAL_HISTORY = "/portal/history";
export const PORTAL_MEDICATIONS = "/portal/medications";
export const PORTAL_METRICS = "/portal/metrics";
export const PORTAL_PRESCRIPTIONS = "/portal/prescriptions";
export const PORTAL_PROFILE = "/portal/profile";
export const PORTAL_PROFILE_CONSENT_FORM = "/portal/profile/consent-form";

/* ── Public ────────────────────────────────────────── */
export const BOOK_REFERRAL = "/book/:referralCode";
export const MOBILE_UPLOAD_ID = "/mobile-upload/:id";
export const PARTNER = "/partner";
export const PARTNER_LOGIN = "/partner/login";
export const PARTNER_DASHBOARD = "/partner/dashboard";
export const PARTNER_BANKING = "/partner/banking";
export const PARTNER_PAYOUTS = "/partner/payouts";
export const PARTNER_REFERRALS = "/partner/referrals";
export const PARTNER_SHARE = "/partner/share";

/* ── Lab Portal ────────────────────────────────────── */
export const LAB_PORTAL = "/lab-portal";
export const LAB_PORTAL_LOGIN = "/lab-portal/login";

/* ── Tools ──────────────────────────────────────────── */
export const VISUAL_TEST_FIXTURE = "/visual-test/:fixture";
export const E2E_SESSION_SEED = "/e2e-session-seed";

/** All routes that do NOT require auth. */
export const PUBLIC_ROUTES: readonly string[] = [
  ...AUTH_ROUTES,
  BOOK_REFERRAL,
  MOBILE_UPLOAD_ID,
  PARTNER, PARTNER_LOGIN, PARTNER_DASHBOARD,
  PARTNER_BANKING, PARTNER_PAYOUTS, PARTNER_REFERRALS, PARTNER_SHARE,
  PORTAL, PORTAL_LOGIN,
  LAB_PORTAL, LAB_PORTAL_LOGIN,
  VISUAL_TEST_FIXTURE, E2E_SESSION_SEED,
] as const;

/** All setup routes (auth required, but no clinic). */
export const SETUP_ROUTE_PATHS: readonly string[] = SETUP_ROUTES;
