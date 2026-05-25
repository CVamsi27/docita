import type { ClinicTier } from '@workspace/db';

export interface OverageUsageInput {
  period: { start: Date; end: Date };
  usage: Record<string, { current: number; included: number; overage: number }>;
  tier: ClinicTier;
  currency?: string;
  rateOverridesCents?: {
    consultation?: number;
    user?: number;
    whatsapp?: number;
    storage?: number;
  };
}

export interface OverageChargeBreakdown {
  quantity: number;
  rate: number;
  charge: number;
}

export interface OverageChargeResult {
  period: { start: Date; end: Date };
  totalOverageCharges: number;
  breakdown: Record<string, OverageChargeBreakdown>;
  currency: string;
}

export interface IOverageCalculation {
  calculateOverageCharges(
    clinicId: string,
    usageData: OverageUsageInput,
  ): Promise<OverageChargeResult>;
}

export const OVERAGE_CALCULATION_TOKEN = 'IOverageCalculation';
