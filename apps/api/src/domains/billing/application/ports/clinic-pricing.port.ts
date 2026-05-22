import type { PricingConfigResponse } from '@workspace/types';

export interface IClinicPricingQuery {
  getPricingConfig(currency?: string): Promise<PricingConfigResponse>;
}

export const CLINIC_PRICING_QUERY_TOKEN = 'IClinicPricingQuery';
