import {
  pricingConfigResponseSchema,
  type PricingConfigResponse,
} from '@workspace/types';

export function lookupTierValue<T extends Record<string, V>, V>(
  source: T,
  key: string,
): V | undefined {
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return undefined;
  }
  return source[key as keyof T];
}

export function lookupTierObject<T extends Record<string, unknown>>(
  source: T,
  key: string,
): Record<string, unknown> {
  const value = lookupTierValue(source, key);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value));
}

export function parsePricingConfigResponse(
  raw: unknown,
): PricingConfigResponse {
  return pricingConfigResponseSchema.parse(raw);
}
