/**
 * Clinic Tier Value Object
 * Represents subscription tier/plan level
 * 
 * Plans: CAPTURE → CORE → GROWTH → SCALE → ENTERPRISE
 * Each tier has different feature sets and pricing
 */

export enum ClinicTierEnum {
  CAPTURE = 'CAPTURE',
  CORE = 'CORE',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE',
  ENTERPRISE = 'ENTERPRISE',
}

const TIER_HIERARCHY: Record<ClinicTierEnum, number> = {
  [ClinicTierEnum.CAPTURE]: 1,
  [ClinicTierEnum.CORE]: 2,
  [ClinicTierEnum.GROWTH]: 3,
  [ClinicTierEnum.SCALE]: 4,
  [ClinicTierEnum.ENTERPRISE]: 5,
};

export class ClinicTier {
  constructor(readonly value: ClinicTierEnum) {}

  isCapture(): boolean {
    return this.value === ClinicTierEnum.CAPTURE;
  }

  isCore(): boolean {
    return this.value === ClinicTierEnum.CORE;
  }

  isGrowth(): boolean {
    return this.value === ClinicTierEnum.GROWTH;
  }

  isScale(): boolean {
    return this.value === ClinicTierEnum.SCALE;
  }

  isEnterprise(): boolean {
    return this.value === ClinicTierEnum.ENTERPRISE;
  }

  /**
   * Check if this tier is higher or equal to another
   */
  isAtLeast(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] >= TIER_HIERARCHY[other.value];
  }

  /**
   * Check if downgrading to another tier
   */
  isDowngradeTo(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] > TIER_HIERARCHY[other.value];
  }

  /**
   * Check if upgrading to another tier
   */
  isUpgradeTo(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] < TIER_HIERARCHY[other.value];
  }

  equals(other: ClinicTier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
