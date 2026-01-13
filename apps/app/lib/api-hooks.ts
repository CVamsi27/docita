import * as aiHooks from "../hooks/api/use-ai";
import * as analyticsHooks from "../hooks/api/use-analytics";
import * as appointmentsHooks from "../hooks/api/use-appointments";
import * as billingHooks from "../hooks/api/use-billing";
import * as clinicalHooks from "../hooks/api/use-clinical";
import * as commonHooks from "../hooks/api/use-common";
import * as contactHooks from "../hooks/api/use-contact";
import * as dashboardHooks from "../hooks/api/use-dashboard";
import * as feedbackHooks from "../hooks/api/use-feedback";
import * as importHooks from "../hooks/api/use-import";
import * as inventoryHooks from "../hooks/api/use-inventory";
import * as medicalCodingHooks from "../hooks/api/use-medical-coding";
import * as patientsHooks from "../hooks/api/use-patients";
import * as referralsHooks from "../hooks/api/use-referrals";
import * as settingsHooks from "../hooks/api/use-settings";
import * as whatsappHooks from "../hooks/api/use-whatsapp";

// Re-export everything
export * from "./api-core";
export * from "../hooks/api/use-ai";
export * from "../hooks/api/use-analytics";
export * from "../hooks/api/use-appointments";
export * from "../hooks/api/use-billing";
export * from "../hooks/api/use-clinical";
export * from "../hooks/api/use-common";
export * from "../hooks/api/use-contact";
export * from "../hooks/api/use-dashboard";
export * from "../hooks/api/use-feedback";
export * from "../hooks/api/use-import";
export * from "../hooks/api/use-inventory";
export * from "../hooks/api/use-medical-coding";
export * from "../hooks/api/use-patients";
export * from "../hooks/api/use-referrals";
export * from "../hooks/api/use-settings";
export * from "../hooks/api/use-whatsapp";

/**
 * @deprecated Use individual hooks instead of this giant object.
 */
export const apiHooks = {
  ...aiHooks,
  ...analyticsHooks,
  // ...appointmentsHooks, // Name conflict with useQueue? No, keys handle it.
  ...billingHooks,
  ...clinicalHooks,
  ...commonHooks,
  ...contactHooks,
  ...dashboardHooks,
  ...feedbackHooks,
  ...importHooks,
  ...inventoryHooks,
  ...medicalCodingHooks,
  ...patientsHooks,
  ...referralsHooks,
  ...settingsHooks,
  ...whatsappHooks,

  // Explicit mapping for potentially conflicting or specific names if spread doesn't work perfectly
  // The spread works because we named the exports the same as the keys in the original object (mostly).
  // But wait, the original object keys were exactly the function names.
  // So spread `...appointmentsHooks` puts `useAppointments` property pointing to `useAppointments` function.
  // This should work perfectly.

  ...appointmentsHooks,
};
