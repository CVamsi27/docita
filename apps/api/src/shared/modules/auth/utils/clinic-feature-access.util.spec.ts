import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import {
  assertClinicHasFeatureOrThrow,
  clinicHasFeatureForAccess,
} from './clinic-feature-access.util';

describe('assertClinicHasFeatureOrThrow', () => {
  it('throws when tier is below the feature requirement', () => {
    expect(() =>
      assertClinicHasFeatureOrThrow(
        {
          tier: ClinicTier.STARTER,
          intelligenceAddon: IntelligenceAddon.NONE,
          features: {},
        },
        Feature.INVOICING,
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows when tier satisfies the feature requirement', () => {
    expect(() =>
      assertClinicHasFeatureOrThrow(
        {
          tier: ClinicTier.ESSENTIAL,
          intelligenceAddon: IntelligenceAddon.NONE,
          features: {},
        },
        Feature.INVOICING,
      ),
    ).not.toThrow();
  });
});

describe('clinicHasFeatureForAccess', () => {
  it('returns false for Starter when feature requires Essential', () => {
    expect(
      clinicHasFeatureForAccess(
        {
          tier: ClinicTier.STARTER,
          intelligenceAddon: IntelligenceAddon.NONE,
          features: {},
        },
        Feature.WHATSAPP_MESSAGING,
      ),
    ).toBe(false);
  });

  it('returns true for Essential on WhatsApp messaging', () => {
    expect(
      clinicHasFeatureForAccess(
        {
          tier: ClinicTier.ESSENTIAL,
          intelligenceAddon: IntelligenceAddon.NONE,
          features: {},
        },
        Feature.WHATSAPP_MESSAGING,
      ),
    ).toBe(true);
  });
});
