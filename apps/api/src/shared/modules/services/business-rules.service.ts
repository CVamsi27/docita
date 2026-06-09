import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { DATE_FORMATS, formatTime } from '@workspace/utils';

@Injectable()
export class BusinessRulesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  validateAppointmentTimeRange(
    startTime: Date,
    endTime: Date,
    _appointmentId?: string,
  ): void {
    if (endTime <= startTime)
      throw new BadRequestException('End time must be after start time');

    if (startTime < this.clock.now())
      throw new BadRequestException(
        'Appointment must be scheduled in the future',
      );

    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < 30)
      throw new BadRequestException(
        'Appointment duration must be at least 30 minutes',
      );
    if (durationMinutes > 240)
      throw new BadRequestException(
        'Appointment duration cannot exceed 4 hours',
      );
  }

  async validateDoctorAvailability(
    doctorId: string,
    clinicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        clinicId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    if (overlap)
      throw new BadRequestException(
        `Doctor has an overlapping appointment from ${formatTime(
          overlap.startTime,
          DATE_FORMATS.TIME_SHORT,
        )} to ${formatTime(overlap.endTime, DATE_FORMATS.TIME_SHORT)}`,
      );
  }

  validateMedication(
    name: string,
    dosage: string,
    frequency: string,
    duration?: string,
  ): void {
    if (!name || name.trim().length === 0)
      throw new BadRequestException('Medication name is required');
    if (!dosage || dosage.trim().length === 0)
      throw new BadRequestException('Dosage is required');
    if (!frequency || frequency.trim().length === 0)
      throw new BadRequestException('Frequency is required');

    if (name.length > 255)
      throw new BadRequestException('Medication name exceeds maximum length');

    if (!/\d+\s*[a-zA-Z]+/.test(dosage))
      throw new BadRequestException(
        'Dosage must include numeric value and unit (e.g., "500 mg")',
      );

    if (duration && duration.trim().length > 0) {
      if (!/\d+\s*(day|week|month|hour)s?/.test(duration.toLowerCase())) {
        throw new BadRequestException(
          'Duration must include number and time unit (e.g., "5 days")',
        );
      }
    }
  }

  validateInvoice(
    items: Array<{ description: string; quantity: number; price: number }>,
    total: number,
  ): void {
    if (!items || items.length === 0)
      throw new BadRequestException('Invoice must have at least one item');

    let calculatedTotal = 0;
    items.forEach((item, index) => {
      if (item.quantity <= 0)
        throw new BadRequestException(
          `Item ${index + 1}: Quantity must be greater than 0`,
        );
      if (item.price < 0)
        throw new BadRequestException(
          `Item ${index + 1}: Price cannot be negative`,
        );
      if (!item.description || item.description.trim().length === 0)
        throw new BadRequestException(
          `Item ${index + 1}: Description is required`,
        );

      calculatedTotal += item.quantity * item.price;
    });

    if (Math.abs(total - calculatedTotal) > 0.01)
      throw new BadRequestException(
        `Invoice total (${total}) does not match calculated amount (${calculatedTotal})`,
      );

    if (total > 10000000)
      throw new BadRequestException(
        'Invoice total exceeds maximum allowed amount',
      );
  }

  validateCrossFieldConstraints(data: Record<string, unknown>): void {
    const isPRN = data.isPRN === true;
    const prnInstructions =
      typeof data.prnInstructions === 'string' ? data.prnInstructions : '';
    const status = typeof data.status === 'string' ? data.status : '';
    const hasCompletedAt = Boolean(data.completedAt);
    const hasInsuranceProvider = Boolean(data.insuranceProvider);
    const hasInsurancePolicyNumber = Boolean(data.insurancePolicyNumber);

    if (isPRN && prnInstructions.trim().length === 0)
      throw new BadRequestException(
        'PRN instructions are required when medication is marked needed (PRN)',
      );

    if (status === 'COMPLETED' && !hasCompletedAt)
      throw new BadRequestException(
        'Completion date is required when marking appointment completed',
      );

    if (hasInsuranceProvider && !hasInsurancePolicyNumber)
      throw new BadRequestException(
        'Insurance policy number is required when insurance provider is specified',
      );
  }

  validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus])
      throw new BadRequestException(
        `Unknown appointment status: ${currentStatus}`,
      );
    if (!validTransitions[currentStatus].includes(newStatus))
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
  }

  validatePatientDateConsistency(
    dateOfBirth: Date,
    codeStatusUpdatedAt?: Date,
    advanceDirectiveDate?: Date,
  ): void {
    const today = this.clock.now();

    const age = today.getFullYear() - dateOfBirth.getFullYear();
    if (age < 0 || age > 150)
      throw new BadRequestException(
        'Invalid date of birth. Patient age must be between 0 and 150 years',
      );

    if (codeStatusUpdatedAt && codeStatusUpdatedAt > today)
      throw new BadRequestException(
        'Code status update date cannot be in the future',
      );

    if (advanceDirectiveDate && advanceDirectiveDate < dateOfBirth)
      throw new BadRequestException(
        'Advance directive date cannot be before patient birth date',
      );
  }
}
