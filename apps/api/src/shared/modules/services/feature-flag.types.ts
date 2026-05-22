export type FeatureFlagValue =
  | boolean
  | number
  | string
  | Record<string, unknown>
  | null
  | unknown[];

export interface ClinicPricingOffer {
  title: string;
  description: string;
  percentOff: number;
  validUntil?: string;
  durationMonths?: number;
  notes?: string;
}

export interface FeatureFlagConfig {
  key: string;
  defaultValue: FeatureFlagValue;
  description: string;

  perClinic?: boolean;
}
