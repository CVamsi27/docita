import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorClinicsService {
  constructor(private prisma: PrismaService) {}

  async assignDoctor(
    doctorId: string,
    clinicId: string,
    role: string = 'doctor',
  ) {
    // Check if assignment already exists
    const existing = await this.prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId,
          clinicId,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.doctorClinic.update({
        where: { id: existing.id },
        data: { active: true, role },
      });
      // Ensure user's primary clinicId is set for token generation
      try {
        await this.prisma.user.update({
          where: { id: doctorId },
          data: { clinicId },
        });
      } catch (e) {
        // ignore if user not found or update fails
      }
      return updated;
    }

    const created = await this.prisma.doctorClinic.create({
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
    // Set user's clinicId so subsequent logins include clinicId in token
    try {
      await this.prisma.user.update({
        where: { id: doctorId },
        data: { clinicId },
      });
    } catch (e) {
      // ignore errors updating user
    }

    return created;
  }

  async removeDoctor(doctorId: string, clinicId: string) {
    const assignment = await this.prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId,
          clinicId,
        },
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return this.prisma.doctorClinic.update({
      where: { id: assignment.id },
      data: { active: false },
    });
  }

  async getDoctorClinics(doctorId: string) {
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

  async getClinicDoctors(clinicId: string) {
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

  async updateRole(doctorId: string, clinicId: string, role: string) {
    const assignment = await this.prisma.doctorClinic.findUnique({
      where: {
        doctorId_clinicId: {
          doctorId,
          clinicId,
        },
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return this.prisma.doctorClinic.update({
      where: { id: assignment.id },
      data: { role },
    });
  }
}
