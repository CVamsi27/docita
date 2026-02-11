import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service for validating business rules at the service layer.
 * Ensures data integrity and prevents invalid state transitions.
 */
@Injectable()
export class BusinessRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates appointment time ranges and constraints
   */
  validateAppointmentTimeRange(
    startTime: Date,
    endTime: Date,
    appointmentId?: string, // Exclude this appointment when checking overlaps
  ): void {
    // Validate date/time consistency
    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate appointment is not in the past
    if (startTime < new Date()) {
      throw new BadRequestException(
        'Appointment must be scheduled in the future',
      );
    }

    // Validate reasonable appointment duration (30 min - 4 hours)
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException(
        'Appointment duration must be at least 30 minutes',
      );
    }
    if (durationMinutes > 240) {
      throw new BadRequestException(
        'Appointment duration cannot exceed 4 hours',
      );
    }
  }

  /**
   * Checks for overlapping appointments for a doctor
   */
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
        // Check if any appointment overlaps with requested time range
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
        // Only check non-cancelled appointments
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `Doctor has an overlapping appointment from ${overlap.startTime.toLocaleTimeString()} to ${overlap.endTime.toLocaleTimeString()}`,
      );
    }
  }

  /**
   * Validates prescription medication data
   */
  validatePrescriptionMedication(
    name: string,
    dosage: string,
    frequency: string,
    duration?: string,
  ): void {
    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Medication name is required');
    }
    if (!dosage || dosage.trim().length === 0) {
      throw new BadRequestException('Dosage is required');
    }
    if (!frequency || frequency.trim().length === 0) {
      throw new BadRequestException('Frequency is required');
    }

    // Validate medication name length (max 255 chars)
    if (name.length > 255) {
      throw new BadRequestException('Medication name exceeds maximum length');
    }

    // Validate dosage format (should contain number and unit)
    if (!/\d+\s*[a-zA-Z]+/.test(dosage)) {
      throw new BadRequestException(
        'Dosage must include numeric value and unit (e.g., "500 mg")',
      );
    }

    // Validate duration if provided (e.g., "5 days", "2 weeks")
    if (duration && duration.trim().length > 0) {
      if (!/\d+\s*(day|week|month|hour)s?/.test(duration.toLowerCase())) {
        throw new BadRequestException(
          'Duration must include number and time unit (e.g., "5 days")',
        );
      }
    }
  }

  /**
   * Validates invoice data and calculations
   */
  validateInvoice(
    items: Array<{ description: string; quantity: number; price: number }>,
    total: number,
  ): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    // Validate each item
    let calculatedTotal = 0;
    items.forEach((item, index) => {
      // Validate quantity is positive
      if (item.quantity <= 0) {
        throw new BadRequestException(
          `Item ${index + 1}: Quantity must be greater than 0`,
        );
      }

      // Validate price is non-negative
      if (item.price < 0) {
        throw new BadRequestException(
          `Item ${index + 1}: Price cannot be negative`,
        );
      }

      // Validate description
      if (!item.description || item.description.trim().length === 0) {
        throw new BadRequestException(
          `Item ${index + 1}: Description is required`,
        );
      }

      // Calculate expected total
      calculatedTotal += item.quantity * item.price;
    });

    // Validate total amount with small tolerance for floating point (0.01)
    if (Math.abs(total - calculatedTotal) > 0.01) {
      throw new BadRequestException(
        `Invoice total (${total}) does not match calculated amount (${calculatedTotal})`,
      );
    }

    // Validate invoice total is reasonable (not excessive)
    if (total > 10000000) {
      // 10 million currency units
      throw new BadRequestException(
        'Invoice total exceeds maximum allowed amount',
      );
    }
  }

  /**
   * Validates cross-field constraints
   */
  validateCrossFieldConstraints(data: Record<string, any>): void {
    // If isPRN is true, prnInstructions should be required
    if (
      data.isPRN &&
      (!data.prnInstructions || data.prnInstructions.trim().length === 0)
    ) {
      throw new BadRequestException(
        'PRN instructions are required when medication is marked as needed',
      );
    }

    // If status is COMPLETED, completedAt should be provided
    if (data.status === 'COMPLETED' && !data.completedAt) {
      throw new BadRequestException(
        'Completion date is required when marking appointment as completed',
      );
    }

    // If insurance is provided, insurance number should also be provided
    if (data.insuranceProvider && !data.insurancePolicyNumber) {
      throw new BadRequestException(
        'Insurance policy number is required when insurance provider is specified',
      );
    }
  }

  /**
   * Validates appointment status transitions
   */
  validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [], // Terminal state
      CANCELLED: [], // Terminal state
    };

    if (!validTransitions[currentStatus]) {
      throw new BadRequestException(
        `Unknown appointment status: ${currentStatus}`,
      );
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Validates date consistency for patient records
   */
  validatePatientDateConsistency(
    dateOfBirth: Date,
    codeStatusUpdatedAt?: Date,
    advanceDirectiveDate?: Date,
  ): void {
    const today = new Date();

    // Validate age is reasonable (between 0 and 150 years)
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    if (age < 0 || age > 150) {
      throw new BadRequestException(
        'Invalid date of birth. Patient age must be between 0 and 150 years',
      );
    }

    // Validate code status updated date is not in future
    if (codeStatusUpdatedAt && codeStatusUpdatedAt > today) {
      throw new BadRequestException(
        'Code status update date cannot be in the future',
      );
    }

    // Validate advance directive date is after date of birth
    if (advanceDirectiveDate && advanceDirectiveDate < dateOfBirth) {
      throw new BadRequestException(
        'Advance directive date cannot be before patient birth date',
      );
    }
  }
}
