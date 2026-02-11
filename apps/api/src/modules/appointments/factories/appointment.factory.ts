import { Injectable, BadRequestException } from '@nestjs/common';
import { Appointment, AppointmentStatus } from '@workspace/db';

/**
 * Appointment Factory
 * Encapsulates creation logic for Appointment entities
 * Ensures all appointments meet business rule constraints before creation
 */
@Injectable()
export class AppointmentFactory {
  /**
   * Create appointment builder for fluent interface
   */
  builder(): AppointmentBuilder {
    return new AppointmentBuilder();
  }

  /**
   * Validate appointment data before persisting
   */
  validateAppointment(data: Partial<Appointment>): void {
    if (!data.patientId) {
      throw new BadRequestException('Patient ID is required');
    }

    if (!data.doctorId) {
      throw new BadRequestException('Doctor ID is required');
    }

    if (!data.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }

    if (!data.startTime) {
      throw new BadRequestException('Start time is required');
    }

    if (!data.endTime) {
      throw new BadRequestException('End time is required');
    }

    // Validate time range
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate duration (minimum 15 minutes)
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = durationMs / (1000 * 60);

    if (durationMin < 15) {
      throw new BadRequestException('Appointment duration must be at least 15 minutes');
    }

    // Validate duration (maximum 8 hours)
    if (durationMin > 480) {
      throw new BadRequestException('Appointment duration cannot exceed 8 hours');
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = Object.values(AppointmentStatus);
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException(`Invalid appointment status: ${data.status}`);
      }
    }

    // Validate notes length
    if (data.notes && data.notes.length > 5000) {
      throw new BadRequestException('Appointment notes cannot exceed 5000 characters');
    }
  }
}

/**
 * Fluent builder for creating Appointment entities
 */
export class AppointmentBuilder {
  private data: Partial<Appointment> = {
    status: AppointmentStatus.SCHEDULED,
  };

  withPatientId(patientId: string): AppointmentBuilder {
    this.data.patientId = patientId;
    return this;
  }

  withDoctorId(doctorId: string): AppointmentBuilder {
    this.data.doctorId = doctorId;
    return this;
  }

  withClinicId(clinicId: string): AppointmentBuilder {
    this.data.clinicId = clinicId;
    return this;
  }

  withStartTime(startTime: Date | string): AppointmentBuilder {
    this.data.startTime = typeof startTime === 'string' ? new Date(startTime) : startTime;
    return this;
  }

  withEndTime(endTime: Date | string): AppointmentBuilder {
    this.data.endTime = typeof endTime === 'string' ? new Date(endTime) : endTime;
    return this;
  }

  withAppointmentType(type: string): AppointmentBuilder {
    this.data.appointmentType = type;
    return this;
  }

  withStatus(status: AppointmentStatus): AppointmentBuilder {
    this.data.status = status;
    return this;
  }

  withNotes(notes: string): AppointmentBuilder {
    this.data.notes = notes;
    return this;
  }

  withReason(reason: string): AppointmentBuilder {
    this.data.reason = reason;
    return this;
  }

  withLocation(location: string): AppointmentBuilder {
    this.data.location = location;
    return this;
  }

  withIsEmergency(isEmergency: boolean): AppointmentBuilder {
    this.data.isEmergency = isEmergency;
    return this;
  }

  build(): Partial<Appointment> {
    return this.data;
  }
}
