export enum AppointmentStatusEnum {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NOSHOW = 'NOSHOW',
}

export class AppointmentStatus {
  private readonly value: AppointmentStatusEnum;

  constructor(value: AppointmentStatusEnum) {
    if (!Object.values(AppointmentStatusEnum).includes(value)) {
      throw new Error(`Invalid appointment status: ${value}`);
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

  equals(other: AppointmentStatus): boolean {
    return this.value === other.getValue();
  }
}
