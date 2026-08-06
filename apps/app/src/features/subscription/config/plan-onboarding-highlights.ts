import { SUBSCRIPTION_TRIAL_DAYS } from "@workspace/types";

export const PLAN_ONBOARDING_KEY_HIGHLIGHTS: Record<string, string[]> = {
  STARTER: [
    "Patients, visits, and prescriptions in one workspace",
    "Excel import, exports, and paper-friendly uploads",
    "Single doctor seat on the free tier",
    "Upgrade anytime when you outgrow limits",
  ],
  ESSENTIAL: [
    "WhatsApp flows with 500 msgs / month included",
    "Invoicing and GST-ready totals",
    "Queue and calendar tuned for busy OPD",
    `${SUBSCRIPTION_TRIAL_DAYS}-day trial where checkout is eligible`,
  ],
  PROFESSIONAL: [
    "Up to 5 doctors with role-aware access",
    "Higher consultation and WhatsApp bundles",
    "Multi-branch analytics on the roadmap",
    "Priority support for growing clinics",
  ],
  HOSPITAL: [
    "Up to 25 doctors and 5 branches",
    "Pooled WhatsApp (6,000 msgs / month) across branches",
    "Multi-location analytics & dashboards",
    "Dedicated customer success manager",
  ],
  ENTERPRISE: [
    "Unlimited scale for users, branches, and patients",
    "Custom contracts, SLAs, and integrations",
    "Dedicated rollout and account team",
    "Sales-led pricing for your exact scope",
  ],
};
