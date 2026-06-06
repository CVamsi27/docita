import type {
  ClinicPricingOffer,
  FeatureFlagValue,
} from '@/shared/modules/services/feature-flag.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function coerceFeatureFlagValue(value: unknown): FeatureFlagValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
    return value;

  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    return value;
  }

  return null;
}

export function parseClinicPricingOffer(
  value: FeatureFlagValue,
): ClinicPricingOffer | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = value.title;
  const description = value.description;
  const percentOff = value.percentOff;

  if (
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    typeof percentOff !== 'number'
  )
    return null;

  const offer: ClinicPricingOffer = {
    title,
    description,
    percentOff,
  };

  if (typeof value.validUntil === 'string') {
    offer.validUntil = value.validUntil;
  }
  if (typeof value.durationMonths === 'number') {
    offer.durationMonths = value.durationMonths;
  }
  if (typeof value.notes === 'string') {
    offer.notes = value.notes;
  }

  return offer;
}
