import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export enum ClinicTierEnum {
  STARTER = 'STARTER',
  ESSENTIAL = 'ESSENTIAL',
  FRONT_DESK = 'FRONT_DESK',
  PROFESSIONAL = 'PROFESSIONAL',
  HOSPITAL = 'HOSPITAL',
  ENTERPRISE = 'ENTERPRISE',
}

const TIER_HIERARCHY: Record<ClinicTierEnum, number> = {
  [ClinicTierEnum.STARTER]: 1,
  [ClinicTierEnum.ESSENTIAL]: 2,
  [ClinicTierEnum.FRONT_DESK]: 2,
  [ClinicTierEnum.PROFESSIONAL]: 3,
  [ClinicTierEnum.HOSPITAL]: 4,
  [ClinicTierEnum.ENTERPRISE]: 5,
};

// Map legacy DB enum values to the canonical tier enum
const LEGACY_TIER_MAP: Record<string, ClinicTierEnum> = {
  CAPTURE: ClinicTierEnum.STARTER,
  CORE: ClinicTierEnum.ESSENTIAL,
  PLUS: ClinicTierEnum.ESSENTIAL,
  PRO: ClinicTierEnum.PROFESSIONAL,
  CLINIC: ClinicTierEnum.PROFESSIONAL,
  // Old internal names
  GROWTH: ClinicTierEnum.ESSENTIAL,
  SCALE: ClinicTierEnum.PROFESSIONAL,
  FREE: ClinicTierEnum.STARTER,
};

export class ClinicTier {
  constructor(readonly value: ClinicTierEnum) {}

  static fromString(value: string): ClinicTier {
    const canonical = Object.values(ClinicTierEnum).find((v) => v === value);
    if (canonical) {
      return new ClinicTier(canonical);
    }
    const legacy = LEGACY_TIER_MAP[value];
    if (legacy) {
      return new ClinicTier(legacy);
    }
    throw new InvariantViolationError(`Invalid clinic tier: ${value}`);
  }

  isStarter(): boolean {
    return this.value === ClinicTierEnum.STARTER;
  }

  isEssential(): boolean {
    return this.value === ClinicTierEnum.ESSENTIAL;
  }

  isFrontDesk(): boolean {
    return this.value === ClinicTierEnum.FRONT_DESK;
  }

  isProfessional(): boolean {
    return this.value === ClinicTierEnum.PROFESSIONAL;
  }

  isHospital(): boolean {
    return this.value === ClinicTierEnum.HOSPITAL;
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
