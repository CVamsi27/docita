export interface ClinicDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  razorpayCustomerId?: string;
}

export interface ClinicUpdateData {
  clinicId: string;
  tier?: string;
  intelligenceAddon?: string;
  subscriptionStatus?: string;
  /** ISO 8601; null clears the client deadline after payment or expiry. */
  subscriptionGraceUntil?: string | null;
}

export interface IClinicOperations {
  getClinicDetails(clinicId: string): Promise<ClinicDetails>;
  updateRazorpayCustomerId(clinicId: string, customerId: string): Promise<void>;
  updateTierAndFeatures(
    clinicId: string,
    tier: string,
    subscriptionStatus: string,
    features: Record<string, boolean>,
    /** Optional plan mode (Full / Front Desk / Core). Persists onto Clinic.planMode when provided. */
    planMode?: string,
  ): Promise<void>;
  emitUpdate(clinicId: string, data: ClinicUpdateData): Promise<void>;
}

export const CLINIC_OPERATIONS_TOKEN = 'IClinicOperations';
