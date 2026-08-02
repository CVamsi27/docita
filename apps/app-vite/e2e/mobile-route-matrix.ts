/**
 * Canonical list of mobile smoke routes for apps/app-vite Playwright specs.
 * Grouped by shell; used to document coverage and drive parameterized tests.
 */

export type MobileRouteFixture = "patient" | "appointment" | "invoice" | "none";

export interface MobileRouteEntry {
  path: string;
  label: string;
  group:
    | "protected-static"
    | "protected-dynamic"
    | "portal"
    | "auth"
    | "setup"
    | "public";
  fixture: MobileRouteFixture;
  /** Skip in CI mobile job (tools, flaky, or auth-only). */
  skipInCi?: boolean;
}

export const PROTECTED_STATIC_MOBILE_ROUTES: MobileRouteEntry[] = [
  {
    path: "/today",
    label: "Today",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/patients",
    label: "Patients",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/appointments",
    label: "Appointments",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/consultation",
    label: "Consultation queue",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/prescriptions",
    label: "Prescriptions",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/documents",
    label: "Documents",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/invoices",
    label: "Invoices",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/invoices/new",
    label: "New invoice",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/lab-tests",
    label: "Lab tests",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/inventory",
    label: "Inventory",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/inbox",
    label: "Inbox",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/whatsapp",
    label: "WhatsApp",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/desk/floor",
    label: "Desk floor",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/ai-assistant",
    label: "AI assistant",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/import",
    label: "Import",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/analytics",
    label: "Analytics",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/settings",
    label: "Settings",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/settings?tab=subscription",
    label: "Settings subscription",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/help",
    label: "Help",
    group: "protected-static",
    fixture: "none",
  },
  {
    path: "/profile",
    label: "Profile",
    group: "protected-static",
    fixture: "none",
  },
];

export const PROTECTED_DYNAMIC_MOBILE_ROUTES: MobileRouteEntry[] = [
  {
    path: "/patients/[id]",
    label: "Patient detail",
    group: "protected-dynamic",
    fixture: "patient",
  },
  {
    path: "/consultation/[id]",
    label: "Consultation detail",
    group: "protected-dynamic",
    fixture: "appointment",
  },
  {
    path: "/invoices/[id]",
    label: "Invoice detail",
    group: "protected-dynamic",
    fixture: "invoice",
  },
];

export const PORTAL_MOBILE_ROUTES: MobileRouteEntry[] = [
  { path: "/portal", label: "Portal home", group: "portal", fixture: "none" },
  {
    path: "/portal/appointments",
    label: "Portal appointments",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/prescriptions",
    label: "Portal prescriptions",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/medications",
    label: "Portal medications",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/history",
    label: "Portal history",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/metrics",
    label: "Portal metrics",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/billing",
    label: "Portal billing",
    group: "portal",
    fixture: "none",
  },
  {
    path: "/portal/profile",
    label: "Portal profile",
    group: "portal",
    fixture: "none",
  },
];

export const AUTH_SETUP_MOBILE_ROUTES: MobileRouteEntry[] = [
  { path: "/login", label: "Login", group: "auth", fixture: "none" },
  {
    path: "/forgot-password",
    label: "Forgot password",
    group: "auth",
    fixture: "none",
  },
  {
    path: "/reset-password",
    label: "Reset password",
    group: "auth",
    fixture: "none",
    skipInCi: true,
  },
  {
    path: "/choose-path",
    label: "Choose path",
    group: "setup",
    fixture: "none",
    skipInCi: true,
  },
  {
    path: "/onboarding",
    label: "Onboarding",
    group: "setup",
    fixture: "none",
    skipInCi: true,
  },
];
