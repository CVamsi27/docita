import { z } from 'zod';
import { ClinicType as _ClinicType } from '@workspace/db';
import { facilityTypeSchema, taxRegimeSchema } from '@workspace/types';
const BankAccountSchema = z.object({
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
});

const TaxSettingsSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'countryCode must be a 2-letter ISO code')
    .optional(),
  regime: taxRegimeSchema.optional(),
  registrationId: z.string().trim().optional(),
  registrationLabel: z.string().trim().optional(),
  legalName: z.string().trim().max(160).optional(),
  stateCode: z.string().trim().max(8).optional(),
  stateName: z.string().trim().max(120).optional(),
});

const MapsLocationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
  })
  .strict();

export const ClinicSettingsSchema = z.object({
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().default(30),
  reminderBefore: z.union([z.string(), z.number()]).optional(),
  reminderUnit: z.string().optional(),
  whatsappAppointmentReminders: z.boolean().optional(),
  whatsappFollowUpMessages: z.boolean().optional(),
  whatsappBirthdayWishes: z.boolean().optional(),
  whatsappMedicineReminders: z.boolean().optional(),
  customFields: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean(),
      }),
    )
    // jscpd:ignore-start
    .optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  appointmentAlerts: z.boolean().optional(),
  reportAlerts: z.boolean().optional(),
  twoFactorAuth: z.boolean().optional(),
  sessionTimeout: z.union([z.string(), z.number()]).optional(),
  auditLogs: z.boolean().optional(),
  theme: z.string().optional(),
  primaryColor: z.string().optional(),
  compactMode: z.boolean().optional(),

  paymentReminderEnabled: z.boolean().optional(),
  paymentReminderDays: z.array(z.number().int().min(1).max(30)).optional(),
  paymentReminderAutoSendWhatsApp: z.boolean().optional(),

  useSameBankAccountForSubscriptionAndReceipts: z.boolean().optional(),
  subscriptionPaymentBankAccount: BankAccountSchema.optional(),
  paymentReceivingBankAccount: BankAccountSchema.optional(),

  defaultInstructions: z.string().optional(),
  defaultFooterText: z.string().optional(),
  // jscpd:ignore-end
  includeClinicHeader: z.boolean().optional(),
  includeDoctorSignature: z.boolean().optional(),
  includeQRCode: z.boolean().optional(),

  /**
   * Printable OPD slip (Front Desk) — free-revisit window in days (0 hides the
   * notice) and an optional extra footer line. No clinical authoring.
   */
  opdSlipRevisitValidityDays: z.number().int().min(0).max(365).optional(),
  opdSlipFooterNote: z.string().trim().max(500).optional(),

  facilityLabel: facilityTypeSchema.optional(),

  /**
   * International tax planning:
   * This lives in JSON settings so we can support multiple jurisdictions without
   * DB migrations, while keeping India GST (`gstin`) as-is for existing flows.
   */
  taxSettings: TaxSettingsSchema.optional(),

  /** Used for patient-facing directions (e.g., WhatsApp confirmations). */
  mapsLocation: MapsLocationSchema.optional(),
  /**
   * User-attached Google Maps link for the facility. Preferred over
   * `mapsLocation` when present, since clinics may want a custom
   * Plus-code, share-link, or business listing URL on notifications.
   */
  mapsLink: z
    .string()
    .trim()
    .url('mapsLink must be a valid URL')
    .or(z.literal(''))
    .optional(),
});

export type ClinicSettings = z.infer<typeof ClinicSettingsSchema>;
