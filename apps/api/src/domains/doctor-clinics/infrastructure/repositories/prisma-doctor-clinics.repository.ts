import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IDoctorClinicsRepository } from '@/domains/doctor-clinics/application/ports/doctor-clinics.repository.port';

@Injectable()
export class PrismaDoctorClinicsRepository implements IDoctorClinicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAssignment(doctorId: string, clinicId: string): Promise<unknown | null> {
    return this.prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId,
          clinicId,
        },
      },
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
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
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
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
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
