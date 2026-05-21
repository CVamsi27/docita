import { Injectable } from '@nestjs/common';
import { labTestOrderResultJsonSchema } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { PrismaService } from '@/prisma/prisma.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { ILabRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  LabTestOrderStatus,
  Prisma,
  LabTest as PrismaLabTest,
  LabTestOrder as PrismaLabTestOrder,
} from '@workspace/db';

@Injectable()
export class PrismaLabRepository implements ILabRepository {
  constructor(private prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findAllTests(clinicId: string): Promise<LabTest[]> {
    const tests = await this.getReadClient().labTest.findMany({
      where: { clinicId },
    });
    return tests.map((t) => this.mapToLabTest(t));
  }

  async findTestById(id: string): Promise<LabTest | null> {
    const test = await this.getReadClient().labTest.findUnique({
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
    const statusFilter = params?.status
      ? parseStringEnumMember(Object.values(LabTestOrderStatus), params.status)
      : undefined;

    const where: Prisma.LabTestOrderWhereInput = {
      clinicId,
      ...(params?.patientId && { patientId: params.patientId }),
      ...(statusFilter && { status: statusFilter }),
    };

    const readClient = this.getReadClient();

    if (params?.search) {
      const matchingPatients = await readClient.patient.findMany({
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

    const orders = await readClient.labTestOrder.findMany({
      where,
      include: { labTest: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapToLabOrder(o));
  }

  async findOrderById(id: string): Promise<LabOrder | null> {
    const order = await this.getReadClient().labTestOrder.findUnique({
      where: { id },
      include: { labTest: true },
    });

    if (!order) return null;
    return this.mapToLabOrder(order);
  }

  async saveOrder(order: LabOrder): Promise<LabOrder> {
    const data: Prisma.LabTestOrderUncheckedCreateInput = {
      clinicId: order.clinicId,
      patientId: order.patientId,
      appointmentId: order.appointmentId || null,
      labTestId: order.labTestId,
      status: order.status,
      result: toPrismaInputJsonValue(order.result),
      resultUrl: order.resultUrl || null,
      notes: order.notes || null,
      orderedBy: 'SYSTEM',
    };

    const saved = await this.prisma.labTestOrder.upsert({
      where: { id: order.id || 'new' },
      create: data,
      update: data,
      include: { labTest: true },
    });

    return this.mapToLabOrder(saved);
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
    const counts = await this.getReadClient().labTestOrder.groupBy({
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

  private mapToLabOrder(prismaOrder: PrismaLabTestOrder): LabOrder {
    const parsedResult = parsePrismaJsonColumn(
      prismaOrder.result,
      labTestOrderResultJsonSchema,
    );
    const normalizedResult = parsedResult
      ? Object.fromEntries(Object.entries(parsedResult))
      : undefined;

    return new LabOrder(
      prismaOrder.id,
      prismaOrder.patientId,
      prismaOrder.labTestId,
      prismaOrder.status,
      prismaOrder.clinicId,
      prismaOrder.appointmentId || undefined,
      normalizedResult,
      prismaOrder.resultUrl || undefined,
      prismaOrder.notes || undefined,
      prismaOrder.createdAt,
      prismaOrder.updatedAt,
    );
  }
}
