import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LabTest } from '../../core/entities/lab-test.entity';
import { LabOrder } from '../../core/entities/lab-order.entity';
import {
  ILabRepository,
  IMedicalCodingRepository,
} from '../../core/repositories/clinical.repository.interface';
import {
  LabTestOrderStatus,
  Prisma,
  Patient,
  LabTest as PrismaLabTest,
  LabTestOrder as PrismaLabTestOrder,
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

type PatientSubset = Pick<
  Patient,
  'id' | 'firstName' | 'lastName' | 'phoneNumber'
>;

@Injectable()
export class PrismaClinicalRepository
  implements ILabRepository, IMedicalCodingRepository
{
  constructor(private prisma: PrismaService) {}

  async findAllTests(clinicId: string): Promise<LabTest[]> {
    const tests = await this.prisma.labTest.findMany({
      where: { clinicId },
    });
    return tests.map((t) => this.mapToLabTest(t));
  }

  async findTestById(id: string): Promise<LabTest | null> {
    const test = await this.prisma.labTest.findUnique({
      where: { id },
    });
    return test ? this.mapToLabTest(test) : null;
  }

  async saveTest(labTest: LabTest): Promise<LabTest> {
    const data: Prisma.LabTestUncheckedCreateInput = {
      clinicId: labTest.clinicId,
      name: labTest.name,
      category: labTest.category,
      price: labTest.price || null,
      description: labTest.description,
      code: labTest.code,
      active: labTest.active,
    };

    const saved = await this.prisma.labTest.upsert({
      where: { id: labTest.id || 'new' },
      create: data,
      update: data,
    });

    return this.mapToLabTest(saved);
  }

  async findAllOrders(
    clinicId: string,
    params?: {
      search?: string;
      status?: string;
      date?: string;
      patientId?: string;
    },
  ): Promise<LabOrder[]> {
    const where: Prisma.LabTestOrderWhereInput = {
      clinicId,
      ...(params?.patientId && { patientId: params.patientId }),
      ...(params?.status && { status: params.status as LabTestOrderStatus }),
    };

    if (params?.search) {
      const matchingPatients = await this.prisma.patient.findMany({
        where: {
          clinicId,
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.patientId = { in: matchingPatients.map((p) => p.id) };
    }

    const orders = await this.prisma.labTestOrder.findMany({
      where,
      include: {
        labTest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const patientIds = Array.from(new Set(orders.map((o) => o.patientId)));
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });

    const patientMap = new Map<string, PatientSubset>(
      patients.map((p) => [p.id, p]),
    );

    return orders.map((o) => {
      const patient = patientMap.get(o.patientId);
      return this.mapToLabOrder(o, patient);
    });
  }

  async findOrderById(id: string): Promise<LabOrder | null> {
    const order = await this.prisma.labTestOrder.findUnique({
      where: { id },
      include: {
        labTest: true,
      },
    });

    if (!order) return null;

    const patient = await this.prisma.patient.findUnique({
      where: { id: order.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });

    return this.mapToLabOrder(order, patient);
  }

  async saveOrder(order: LabOrder): Promise<LabOrder> {
    const data: Prisma.LabTestOrderUncheckedCreateInput = {
      clinicId: order.clinicId,
      patientId: order.patientId,
      appointmentId: order.appointmentId || null,
      labTestId: order.labTestId,
      status: order.status,
      result: order.result as Prisma.InputJsonValue,
      resultUrl: order.resultUrl || null,
      notes: order.notes || null,
      orderedBy: 'SYSTEM',
    };

    const saved = await this.prisma.labTestOrder.upsert({
      where: { id: order.id || 'new' },
      create: data,
      update: data,
      include: {
        labTest: true,
      },
    });

    const patient = await this.prisma.patient.findUnique({
      where: { id: saved.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });

    return this.mapToLabOrder(saved, patient);
  }

  async deleteOrder(id: string): Promise<void> {
    await this.prisma.labTestOrder.delete({
      where: { id },
    });
  }

  async getStats(clinicId: string): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }> {
    const counts = await this.prisma.labTestOrder.groupBy({
      by: ['status'],
      where: { clinicId },
      _count: true,
    });

    const stats = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      urgent: 0,
      total: 0,
    };

    counts.forEach((c) => {
      const count = c._count;
      stats.total += count;
      if (c.status === 'ORDERED') stats.pending += count;
      if (c.status === 'PENDING') stats.inProgress += count;
      if (c.status === 'COMPLETED') stats.completed += count;
    });

    return stats;
  }

  searchIcdCodes(query: string): Promise<IcdCode[]> {
    return this.prisma.icdCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  findIcdByCode(code: string): Promise<IcdCode | null> {
    return this.prisma.icdCode.findUnique({
      where: { code },
    });
  }

  searchCptCodes(query: string): Promise<CptCode[]> {
    return this.prisma.cptCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  async getFavorites(userId: string): Promise<IcdCode[]> {
    const favorites = await this.prisma.doctorFavoriteCode.findMany({
      where: { userId, icdCodeId: { not: null } },
      include: { icdCode: true },
    });
    return favorites.map((f) => f.icdCode).filter((c): c is IcdCode => !!c);
  }

  addFavorite(userId: string, icdCodeId: string): Promise<DoctorFavoriteCode> {
    return this.prisma.doctorFavoriteCode.create({
      data: { userId, icdCodeId },
    });
  }

  async removeFavorite(userId: string, icdCodeId: string): Promise<void> {
    await this.prisma.doctorFavoriteCode.deleteMany({
      where: { userId, icdCodeId },
    });
  }

  async getCptFavorites(userId: string): Promise<CptCode[]> {
    const favorites = await this.prisma.doctorFavoriteCode.findMany({
      where: { userId, cptCodeId: { not: null } },
      include: { cptCode: true },
    });
    return favorites.map((f) => f.cptCode).filter((c): c is CptCode => !!c);
  }

  addCptFavorite(
    userId: string,
    cptCodeId: string,
  ): Promise<DoctorFavoriteCode> {
    return this.prisma.doctorFavoriteCode.create({
      data: { userId, cptCodeId },
    });
  }

  async removeCptFavorite(userId: string, cptCodeId: string): Promise<void> {
    await this.prisma.doctorFavoriteCode.deleteMany({
      where: { userId, cptCodeId },
    });
  }

  async getUncodedVisits(
    clinicId: string,
    search?: string,
  ): Promise<Record<string, unknown>[]> {
    const visits = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: 'COMPLETED',
        diagnoses: { none: {} },
        ...(search && {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        }),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      take: 20,
    });
    return visits;
  }

  private mapToLabTest(prismaTest: PrismaLabTest): LabTest {
    return new LabTest(
      prismaTest.id,
      prismaTest.name,
      prismaTest.category,
      prismaTest.clinicId,
      prismaTest.active,
      prismaTest.code || undefined,
      prismaTest.price ? Number(prismaTest.price) : undefined,
      prismaTest.description || undefined,
    );
  }

  private mapToLabOrder(
    prismaOrder: PrismaLabTestOrder,
    patient?: PatientSubset | null,
  ): LabOrder {
    return new LabOrder(
      prismaOrder.id,
      prismaOrder.patientId,
      prismaOrder.labTestId,
      prismaOrder.status,
      prismaOrder.clinicId,
      prismaOrder.appointmentId || undefined,
      prismaOrder.result as Record<string, unknown> | undefined,
      prismaOrder.resultUrl || undefined,
      prismaOrder.notes || undefined,
      prismaOrder.createdAt,
      prismaOrder.updatedAt,
    );
  }
}
