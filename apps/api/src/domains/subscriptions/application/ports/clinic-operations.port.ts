export interface ClinicDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  razorpayCustomerId?: string;
}

export interface IClinicOperations {
  getClinicDetails(clinicId: string): Promise<ClinicDetails>;
  updateRazorpayCustomerId(clinicId: string, customerId: string): Promise<void>;
  updateTierAndFeatures(
    clinicId: string,
    tier: string,
    subscriptionStatus: string,
    features: Record<string, boolean>,
  ): Promise<void>;
  emitUpdate(clinicId: string, data: any): Promise<void>;
}
