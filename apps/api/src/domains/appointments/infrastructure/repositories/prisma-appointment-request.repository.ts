import { Injectable } from '@nestjs/common';
import { AppointmentRequestStatus, Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentRequestListFilters,
  AppointmentRequestMatchingAppointmentInput,
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

type AppointmentRequestDbRow = Prisma.AppointmentRequestGetPayload<{
  include: typeof APPOINTMENT_REQUEST_INCLUDE;
}>;

@Injectable()
export class PrismaAppointmentRequestRepository implements IAppointmentRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(
    data: Prisma.AppointmentRequestUncheckedCreateInput,
  ): Promise<AppointmentRequestWithRelations> {
    const row: AppointmentRequestDbRow =
      await this.prisma.appointmentRequest.create({
        data,
        include: APPOINTMENT_REQUEST_INCLUDE,
      });
    return row satisfies AppointmentRequestWithRelations;
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
      items: items satisfies AppointmentRequestWithRelations[],
      total,
    };
  }

  async findByIdAndClinic(
    id: string,
    clinicId: string,
  ): Promise<AppointmentRequestWithRelations | null> {
    const row = await this.getReadClient().appointmentRequest.findFirst({
      where: { id, clinicId },
      include: APPOINTMENT_REQUEST_INCLUDE,
    });
    if (!row) {
      return null;
    }
    return row satisfies AppointmentRequestWithRelations;
  }

  private async requireByIdAndClinic(
    id: string,
    clinicId: string,
  ): Promise<AppointmentRequestWithRelations> {
    const updated = await this.findByIdAndClinic(id, clinicId);
    if (!updated) {
      throw new Error(
        `Appointment request ${id} not found for clinic ${clinicId}`,
      );
    }
    return updated;
  }

  async update(
    id: string,
    clinicId: string,
    data: Prisma.AppointmentRequestUpdateInput,
  ) {
    await this.prisma.appointmentRequest.updateMany({
      where: { id, clinicId },
      data,
    });

    return this.requireByIdAndClinic(id, clinicId);
  }

  async markReviewed({
    id,
    clinicId,
    status,
    reviewedById,
    responseMessage,
  }: {
    id: string;
    clinicId: string;
    status: AppointmentRequestStatus;
    reviewedById: string;
    responseMessage: string;
  }) {
    const reviewerExists = await this.prisma.user.count({
      where: { id: reviewedById, clinicId },
    });

    await this.prisma.appointmentRequest.updateMany({
      where: { id, clinicId },
      data: {
        status,
        reviewedAt: new Date(),
        responseMessage,
        ...(reviewerExists > 0 ? { reviewedById } : {}),
      },
    });

    return this.requireByIdAndClinic(id, clinicId);
  }

  async findMatchingAppointment({
    clinicId,
    patientId,
    doctorId,
    startTime,
    endTime,
    reason,
    requestCreatedAt,
  }: AppointmentRequestMatchingAppointmentInput) {
    const readClient = this.getReadClient();
    const exactMatch = await readClient.appointment.findFirst({
      where: {
        clinicId,
        patientId,
        doctorId,
        startTime,
        endTime,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (exactMatch) return exactMatch;

    return readClient.appointment.findFirst({
      where: {
        clinicId,
        patientId,
        doctorId,
        notes: reason,
        createdAt: { gte: requestCreatedAt },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
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
