import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export enum ClinicTierEnum {
  STARTER = 'STARTER',
  ESSENTIAL = 'ESSENTIAL',
  PROFESSIONAL = 'PROFESSIONAL',
  HOSPITAL = 'HOSPITAL',
  ENTERPRISE = 'ENTERPRISE',
}

const TIER_HIERARCHY: Record<ClinicTierEnum, number> = {
  [ClinicTierEnum.STARTER]: 1,
  [ClinicTierEnum.ESSENTIAL]: 2,
  [ClinicTierEnum.PROFESSIONAL]: 3,
  [ClinicTierEnum.HOSPITAL]: 4,
  [ClinicTierEnum.ENTERPRISE]: 5,
};

export class ClinicTier {
  constructor(readonly value: ClinicTierEnum) {}

  static fromString(value: string): ClinicTier {
    const canonical = Object.values(ClinicTierEnum).find((v) => v === value);
    if (canonical) return new ClinicTier(canonical);
    throw new InvariantViolationError(`Invalid clinic tier: ${value}`);
  }

  isStarter(): boolean {
    return this.value === ClinicTierEnum.STARTER;
  }

  isEssential(): boolean {
    return this.value === ClinicTierEnum.ESSENTIAL;
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
