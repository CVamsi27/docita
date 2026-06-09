import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import {
  type DoctorClinicAssignmentRef,
  IDoctorClinicsRepository,
} from '@/domains/doctor-clinics/application/ports/doctor-clinics.repository.port';

// Shared by `createAssignment` and `findClinicDoctors` — both project the
// same doctor identity fields onto the assignment row, so the projection
// lives in one place rather than the two queries drifting apart.
const DOCTOR_ASSIGNMENT_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class PrismaDoctorClinicsRepository implements IDoctorClinicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAssignment(
    doctorId: string,
    clinicId: string,
  ): Promise<DoctorClinicAssignmentRef | null> {
    return this.prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId,
          clinicId,
        },
      },
      select: { id: true },
    });
  }

  reactivateAssignment(
    assignmentId: string,
    role: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.doctorClinic.update({
      where: { id: assignmentId },
      data: { active: true, role },
    });
  }

  createAssignment(
    doctorId: string,
    clinicId: string,
    role: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.doctorClinic.create({
      data: {
        doctorId,
        clinicId,
        role,
        active: true,
      },
      include: {
        doctor: {
          select: DOCTOR_ASSIGNMENT_SUMMARY_SELECT,
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async assignUserClinic(doctorId: string, clinicId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: doctorId },
      data: { clinicId },
    });
  }

  deactivateAssignment(assignmentId: string): Promise<Record<string, unknown>> {
    return this.prisma.doctorClinic.update({
      where: { id: assignmentId },
      data: { active: false },
    });
  }

  findDoctorClinics(doctorId: string): Promise<unknown[]> {
    return this.prisma.doctorClinic.findMany({
      where: {
        doctorId,
        active: true,
      },
      select: {
        id: true,
        role: true,
        active: true,
        createdAt: true,
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            tier: true,
            logo: true,
          },
        },
      },
    });
  }

  findClinicDoctors(clinicId: string): Promise<unknown[]> {
    return this.prisma.doctorClinic.findMany({
      where: {
        clinicId,
        active: true,
      },
      include: {
        doctor: {
          select: DOCTOR_ASSIGNMENT_SUMMARY_SELECT,
        },
      },
    });
  }

  updateAssignmentRole(
    assignmentId: string,
    role: string,
  ): Promise<Record<string, unknown>> {
    return this.prisma.doctorClinic.update({
      where: { id: assignmentId },
      data: { role },
    });
  }
}
