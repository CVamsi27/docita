import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DOCTOR_CLINICS_REPOSITORY_TOKEN,
  IDoctorClinicsRepository,
} from '@/domains/doctor-clinics/application/ports/doctor-clinics.repository.port';

/**
 * Thin facade — delegates doctor–clinic assignments to IDoctorClinicsRepository.
 */
@Injectable()
export class DoctorClinicsService {
  private readonly logger = new Logger(DoctorClinicsService.name);

  constructor(
    @Inject(DOCTOR_CLINICS_REPOSITORY_TOKEN)
    private readonly doctorClinicsRepository: IDoctorClinicsRepository,
  ) {}

  async assignDoctor(
    doctorId: string,
    clinicId: string,
    role: string = 'doctor',
  ) {
    const existing = await this.doctorClinicsRepository.findAssignment(
      doctorId,
      clinicId,
    );

    if (existing) {
      const updated = await this.doctorClinicsRepository.reactivateAssignment(
        existing.id,
        role,
      );
      try {
        await this.doctorClinicsRepository.assignUserClinic(doctorId, clinicId);
      } catch (error) {
        this.logger.warn(
          `Doctor user-clinic link repair failed for existing assignment: ${this.formatErrorMessage(error)}`,
        );
      }
      return updated;
    }

    const created = await this.doctorClinicsRepository.createAssignment(
      doctorId,
      clinicId,
      role,
    );
    try {
      await this.doctorClinicsRepository.assignUserClinic(doctorId, clinicId);
    } catch (error) {
      this.logger.warn(
        `Doctor user-clinic link creation failed after assignment: ${this.formatErrorMessage(error)}`,
      );
    }

    return created;
  }

  private formatErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async removeDoctor(doctorId: string, clinicId: string) {
    const assignment = await this.doctorClinicsRepository.findAssignment(
      doctorId,
      clinicId,
    );

    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.doctorClinicsRepository.deactivateAssignment(assignment.id);
  }

  async getDoctorClinics(doctorId: string) {
    return this.doctorClinicsRepository.findDoctorClinics(doctorId);
  }

  async getClinicDoctors(clinicId: string) {
    return this.doctorClinicsRepository.findClinicDoctors(clinicId);
  }

  async updateRole(doctorId: string, clinicId: string, role: string) {
    const assignment = await this.doctorClinicsRepository.findAssignment(
      doctorId,
      clinicId,
    );

    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.doctorClinicsRepository.updateAssignmentRole(
      assignment.id,
      role,
    );
  }
}
