import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentRequestListFilters,
  AppointmentRequestWithRelations,
  IAppointmentRequestRepository,
} from '@/domains/appointments/core/repositories/appointment-request.repository.interface';

const APPOINTMENT_REQUEST_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  },
  preferredDoctor: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentRequestInclude;

@Injectable()
export class PrismaAppointmentRequestRepository implements IAppointmentRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(data: Prisma.AppointmentRequestUncheckedCreateInput) {
    return this.prisma.appointmentRequest.create({
      data,
      include: APPOINTMENT_REQUEST_INCLUDE,
    }) as Promise<AppointmentRequestWithRelations>;
  }

  async findForClinic({
    clinicId,
    patientId,
    status,
    from,
    to,
    take,
    skip,
  }: AppointmentRequestListFilters) {
    const where: Prisma.AppointmentRequestWhereInput = { clinicId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (from || to) {
      where.preferredDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const readClient = this.getReadClient();
    const [items, total] = await Promise.all([
      readClient.appointmentRequest.findMany({
        where,
        include: APPOINTMENT_REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      readClient.appointmentRequest.count({ where }),
    ]);

    return {
      items: items as AppointmentRequestWithRelations[],
      total,
    };
  }

  async findByIdAndClinic(id: string, clinicId: string) {
    return this.getReadClient().appointmentRequest.findFirst({
      where: { id, clinicId },
      include: APPOINTMENT_REQUEST_INCLUDE,
    }) as Promise<AppointmentRequestWithRelations | null>;
  }

  async update(id: string, data: Prisma.AppointmentRequestUpdateInput) {
    return this.prisma.appointmentRequest.update({
      where: { id },
      data,
      include: APPOINTMENT_REQUEST_INCLUDE,
    }) as Promise<AppointmentRequestWithRelations>;
  }

  async doctorBelongsToClinic(doctorId: string, clinicId: string) {
    const [directUser, linkedClinic] = await Promise.all([
      this.getReadClient().user.count({
        where: {
          id: doctorId,
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
      }),
      this.getReadClient().doctorClinic.count({
        where: {
          doctorId,
          clinicId,
          active: true,
        },
      }),
    ]);

    return directUser > 0 || linkedClinic > 0;
  }
}
