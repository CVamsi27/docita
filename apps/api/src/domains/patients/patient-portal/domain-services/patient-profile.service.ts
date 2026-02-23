/**
 * Patient Profile Service (SRP)
 *
 * Single Responsibility: Patient profile management and appointment requests.
 * Validates inputs and enforces update field restrictions.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  UpdatePatientProfileBodyDto,
  RequestAppointmentBodyDto,
} from '../dto/patient-portal.dto';

@Injectable()
export class PatientProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update patient profile (restricted fields only)
   * Patients can only update: phoneNumber, email, address, whatsappConsent
   */
  async updateProfile(patientId: string, data: UpdatePatientProfileBodyDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Build update with only allowed fields (security: whitelist approach)
    const updateData = this.buildAllowedUpdate(data);

    return this.prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        email: true,
        phoneNumber: true,
        address: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });
  }

  /**
   * Request a new appointment
   * Creates an appointment request that clinic staff can approve
   */
  async requestAppointment(patientId: string, data: RequestAppointmentBodyDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate preferred doctor belongs to patient's clinic
    if (data.preferredDoctorId) {
      const doctor = await this.prisma.user.findFirst({
        where: {
          id: data.preferredDoctorId,
          role: 'DOCTOR',
          clinicId: patient.clinicId,
        },
        select: { id: true },
      });

      if (!doctor) {
        throw new BadRequestException('Invalid doctor selection');
      }
    }

    const startTime = new Date(data.preferredDate);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    return this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: data.preferredDoctorId || '',
        clinicId: patient.clinicId,
        startTime,
        endTime,
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        notes: data.notes || '',
        chiefComplaint: data.reason,
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        type: true,
      },
    });
  }

  // ========================================================================
  // Private: Field Whitelist (Security)
  // ========================================================================

  private buildAllowedUpdate(data: UpdatePatientProfileBodyDto) {
    const allowed: Record<string, unknown> = {};

    if (data.phoneNumber) allowed.phoneNumber = data.phoneNumber;
    if (data.email) allowed.email = data.email;
    if (data.address) allowed.address = data.address;

    if (data.whatsappConsent !== undefined) {
      allowed.whatsappConsent = data.whatsappConsent;
      if (data.whatsappConsent) {
        allowed.whatsappConsentAt = new Date();
      }
    }

    return allowed;
  }
}
