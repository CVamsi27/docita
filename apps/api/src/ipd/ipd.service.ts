import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Ward,
  Room,
  Bed,
  Admission,
  BedStatus,
  AdmissionStatus,
} from '@workspace/types';

@Injectable()
export class IpdService {
  constructor(private prisma: PrismaService) {}

  // Wards
  async findAllWards(clinicId: string, search?: string): Promise<Ward[]> {
    return this.prisma.ward.findMany({
      where: {
        clinicId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            {
              rooms: {
                some: {
                  OR: [
                    { roomNumber: { contains: search, mode: 'insensitive' } },
                    {
                      beds: {
                        some: {
                          OR: [
                            {
                              bedNumber: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                            {
                              admissions: {
                                some: {
                                  status: 'ADMITTED',
                                  patient: {
                                    OR: [
                                      {
                                        firstName: {
                                          contains: search,
                                          mode: 'insensitive',
                                        },
                                      },
                                      {
                                        lastName: {
                                          contains: search,
                                          mode: 'insensitive',
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }),
      },
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                admissions: {
                  where: { status: 'ADMITTED' },
                  include: {
                    patient: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createWard(data: any): Promise<Ward> {
    return this.prisma.ward.create({
      data,
    });
  }

  // Rooms
  async createRoom(data: any): Promise<Room> {
    return this.prisma.room.create({
      data,
    });
  }

  // Beds
  async createBed(data: any): Promise<Bed> {
    return this.prisma.bed.create({
      data,
    });
  }

  async updateBedStatus(id: string, status: BedStatus): Promise<Bed> {
    return this.prisma.bed.update({
      where: { id },
      data: { status },
    });
  }

  // Admissions
  async admitPatient(data: any): Promise<Admission> {
    const { patientId, bedId, admittingDoctorId, ...rest } = data;

    // Check if bed is available
    const bed = await this.prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed || bed.status !== 'AVAILABLE') {
      throw new Error('Bed is not available');
    }

    // Use transaction to update bed status and create admission
    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' },
      });

      return tx.admission.create({
        data: {
          patientId,
          bedId,
          admittingDoctorId,
          ...rest,
        },
      });
    });
  }

  async dischargePatient(admissionId: string): Promise<Admission> {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
    });
    if (!admission) throw new NotFoundException('Admission not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: 'AVAILABLE' },
      });

      return tx.admission.update({
        where: { id: admissionId },
        data: {
          status: 'DISCHARGED',
          dischargedAt: new Date(),
        },
      });
    });
  }
}
