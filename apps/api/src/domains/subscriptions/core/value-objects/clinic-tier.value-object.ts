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

  static fromString(value: string): ClinicTier {
    const tier = Object.values(ClinicTierEnum).find((v) => v === value);
    if (!tier) {
      throw new Error(`Invalid clinic tier: ${value}`);
    }
    return new ClinicTier(tier);
  }

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

  isAtLeast(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] >= TIER_HIERARCHY[other.value];
  }

  isDowngradeTo(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] < TIER_HIERARCHY[other.value];
  }

  isUpgradeTo(other: ClinicTier): boolean {
    return TIER_HIERARCHY[this.value] > TIER_HIERARCHY[other.value];
  }

  equals(other: ClinicTier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
