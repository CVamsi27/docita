import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@workspace/db';
import {
  Ward,
  Room,
  Bed,
  Admission,
  BedStatus,
  AdmissionStatus,
} from '@workspace/types';
import type {
  CreateWardDto,
  CreateRoomDto,
  CreateBedDto,
  AdmitPatientDto,
} from '@workspace/types';
import { IpdFactory } from './factories/ipd.factory';

@Injectable()
export class IpdService {
  constructor(
    private prisma: PrismaService,
    private ipdFactory: IpdFactory,
  ) {}

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

  async createWard(data: CreateWardDto): Promise<Ward> {
    return this.prisma.ward.create({
      data: data as unknown as Prisma.WardCreateInput,
    });
  }

  // Rooms
  async createRoom(data: CreateRoomDto, clinicId?: string): Promise<Room> {
    if (clinicId) {
      const ward = await this.prisma.ward.findUnique({
        where: { id: (data as any).wardId },
      });
      if (!ward || ward.clinicId !== clinicId) {
        throw new ForbiddenException('Ward does not belong to your clinic');
      }
    }
    return this.prisma.room.create({
      data,
    });
  }

  // Beds
  async createBed(data: CreateBedDto, clinicId?: string): Promise<Bed> {
    if (clinicId) {
      const room = await this.prisma.room.findUnique({
        where: { id: (data as any).roomId },
        include: { ward: { select: { clinicId: true } } },
      });
      if (!room || room.ward.clinicId !== clinicId) {
        throw new ForbiddenException('Room does not belong to your clinic');
      }
    }
    return this.prisma.bed.create({
      data,
    });
  }

  async updateBedStatus(
    id: string,
    status: BedStatus,
    clinicId?: string,
  ): Promise<Bed> {
    if (clinicId) {
      const bed = await this.prisma.bed.findUnique({
        where: { id },
        include: {
          room: { include: { ward: { select: { clinicId: true } } } },
        },
      });
      if (!bed || bed.room.ward.clinicId !== clinicId) {
        throw new ForbiddenException('Bed does not belong to your clinic');
      }
    }
    return this.prisma.bed.update({
      where: { id },
      data: { status },
    });
  }

  // Admissions
  async admitPatient(
    data: AdmitPatientDto,
    clinicId?: string,
  ): Promise<Admission> {
    // Validate and prepare data using factory
    const admissionData = this.ipdFactory.createAdmission(data);
    const { bedId } = admissionData;

    // Check if bed is available
    const bed = await this.prisma.bed.findUnique({
      where: { id: bedId },
      include: clinicId
        ? { room: { include: { ward: { select: { clinicId: true } } } } }
        : undefined,
    });
    if (!bed || bed.status !== 'AVAILABLE') {
      throw new BadRequestException('Bed is not available');
    }
    if (clinicId && (bed as any).room?.ward?.clinicId !== clinicId) {
      throw new ForbiddenException('Bed does not belong to your clinic');
    }

    // Use transaction to update bed status and create admission
    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' },
      });

      return tx.admission.create({
        data: admissionData,
      });
    });
  }

  async dischargePatient(
    admissionId: string,
    clinicId?: string,
  ): Promise<Admission> {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: clinicId
        ? {
            bed: {
              include: {
                room: { include: { ward: { select: { clinicId: true } } } },
              },
            },
          }
        : undefined,
    });
    if (!admission) throw new NotFoundException('Admission not found');
    if (clinicId && (admission as any).bed?.room?.ward?.clinicId !== clinicId) {
      throw new ForbiddenException('Admission does not belong to your clinic');
    }

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
