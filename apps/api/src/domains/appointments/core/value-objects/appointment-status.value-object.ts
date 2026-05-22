import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export enum AppointmentStatusEnum {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NOSHOW = 'NOSHOW',
}

const ENUM_TO_KEBAB: Record<AppointmentStatusEnum, string> = {
  [AppointmentStatusEnum.SCHEDULED]: 'scheduled',
  [AppointmentStatusEnum.CONFIRMED]: 'confirmed',
  [AppointmentStatusEnum.ARRIVED]: 'checked-in',
  [AppointmentStatusEnum.IN_PROGRESS]: 'in-progress',
  [AppointmentStatusEnum.COMPLETED]: 'completed',
  [AppointmentStatusEnum.CANCELLED]: 'cancelled',
  [AppointmentStatusEnum.NOSHOW]: 'no-show',
};

export class AppointmentStatus {
  private readonly value: AppointmentStatusEnum;

  constructor(value: AppointmentStatusEnum) {
    if (!Object.values(AppointmentStatusEnum).includes(value)) {
      throw new InvariantViolationError(`Invalid appointment status: ${value}`);
    }
    this.value = value;
  }

  getValue(): AppointmentStatusEnum {
    return this.value;
  }

  static scheduled(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.SCHEDULED);
  }

  static confirmed(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.CONFIRMED);
  }

  static completed(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.COMPLETED);
  }

  static cancelled(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.CANCELLED);
  }

  isCompleted(): boolean {
    return this.value === AppointmentStatusEnum.COMPLETED;
  }

  isCancelled(): boolean {
    return this.value === AppointmentStatusEnum.CANCELLED;
  }

  isScheduled(): boolean {
    return this.value === AppointmentStatusEnum.SCHEDULED;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return ENUM_TO_KEBAB[this.value];
  }

  equals(other: AppointmentStatus): boolean {
    return this.value === other.getValue();
  }
}
