import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { labTestOrderResultJsonSchema } from '@workspace/types';
import type { PaginatedResponse } from '@workspace/types';
import {
  parseStringEnumMember,
  toCents,
  resolveMoneyCents,
  fromCents,
} from '@workspace/utils';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import { PrismaService } from '@/prisma/prisma.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { ILabRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import type {
  LabOrderReleaseContext,
  LabQueueItem,
} from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import type { LabRecord } from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import {
  LabTestOrderStatus,
  LabType,
  Prisma,
  LabTest as PrismaLabTest,
  LabTestOrder as PrismaLabTestOrder,
} from '@workspace/db';

@Injectable()
export class PrismaLabRepository implements ILabRepository {
  private readonly logger = new Logger(PrismaLabRepository.name);

  constructor(private prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findAllTests(clinicId: string): Promise<LabTest[]> {
    const tests = await this.getReadClient().labTest.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
      take: 1001,
    });
    if (tests.length > 1000) {
      this.logger.warn(
        `Lab test catalog for clinic ${clinicId} exceeds 1000 entries; results are truncated`,
      );
    }
    return tests.slice(0, 1000).map((t) => this.mapToLabTest(t));
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
      // Write both the legacy Float and the canonical cents column (Phase 4 G3).
      price: labTest.price || null,
      priceCents: toCents(labTest.price),
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

  async deleteTest(id: string): Promise<void> {
    await this.prisma.labTest.delete({ where: { id } });
  }

  async findAllOrders(
    clinicId: string,
    params?: {
      search?: string;
      status?: string;
      date?: string;
      patientId?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<PaginatedResponse<LabOrder>> {
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
        take: 500,
      });
      where.patientId = { in: matchingPatients.map((p) => p.id) };
    }

    const safeLimit = Math.min(params?.limit ?? 100, 500);
    const orders = await readClient.labTestOrder.findMany({
      where,
      include: {
        labTest: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
      ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = orders.length > safeLimit;
    const pageOrders = hasMore ? orders.slice(0, safeLimit) : orders;

    // Resolve ordering-doctor names in one batch (orderedBy is a user id, not
    // a Prisma relation on LabTestOrder).
    const orderedByIds = [
      ...new Set(
        pageOrders
          .map((o) => o.orderedBy)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const doctors = orderedByIds.length
      ? await readClient.user.findMany({
          where: { id: { in: orderedByIds } },
          select: { id: true, name: true },
        })
      : [];
    const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));

    const items = pageOrders.map((o) =>
      this.mapToLabOrder(o, {
        patient: o.patient ?? undefined,
        labTest: o.labTest
          ? {
              id: o.labTest.id,
              name: o.labTest.name,
              category: o.labTest.category,
              code: o.labTest.code ?? undefined,
              price: o.labTest.price ?? undefined,
            }
          : undefined,
        doctor:
          o.orderedBy && doctorNameById.has(o.orderedBy)
            ? { name: doctorNameById.get(o.orderedBy)! }
            : undefined,
      }),
    );

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
      hasMore,
      count: items.length,
    };
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
      labId: order.labId || null,
      status: order.status,
      result: toPrismaInputJsonValue(order.result),
      resultUrl: order.resultUrl || null,
      notes: order.notes || null,
      orderedBy: order.orderedBy || 'SYSTEM',
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
      if (
        c.status === 'PENDING' ||
        c.status === 'SAMPLE_COLLECTED' ||
        c.status === 'RESULT_READY'
      )
        stats.inProgress += count;
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
      // Read cents-first, falling back to the legacy Float for un-backfilled rows.
      fromCents(resolveMoneyCents(prismaTest.priceCents, prismaTest.price)) ??
        undefined,
      prismaTest.description || undefined,
    );
  }

  private mapToLabOrder(
    prismaOrder: PrismaLabTestOrder,
    relations?: {
      patient?: { id: string; firstName: string; lastName: string };
      labTest?: {
        id: string;
        name: string;
        category: string;
        code?: string;
        price?: number;
      };
      doctor?: { name: string };
    },
  ): LabOrder {
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
      prismaOrder.labId || undefined,
      prismaOrder.orderedBy || undefined,
      prismaOrder.collectedAt || undefined,
      prismaOrder.completedAt || undefined,
      prismaOrder.resultUploadedBy || undefined,
      prismaOrder.resultUploadedAt || undefined,
      prismaOrder.paidAt || undefined,
      prismaOrder.paymentVerifiedBy || undefined,
      prismaOrder.paymentMethod || undefined,
      prismaOrder.paymentReference || undefined,
      prismaOrder.releasedAt || undefined,
      relations?.patient,
      relations?.labTest,
      relations?.doctor,
    );
  }

  // --- Lab workspace workflow ---

  async findLabQueue(
    clinicId: string,
    params?: { labId?: string; status?: string; search?: string },
  ): Promise<LabQueueItem[]> {
    const statusFilter = params?.status
      ? parseStringEnumMember(Object.values(LabTestOrderStatus), params.status)
      : undefined;

    const where: Prisma.LabTestOrderWhereInput = {
      clinicId,
      ...(params?.labId && { labId: params.labId }),
      ...(statusFilter && { status: statusFilter }),
    };

    if (params?.search) {
      where.patient = {
        is: {
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const orders = await this.getReadClient().labTestOrder.findMany({
      where,
      include: {
        labTest: { select: { id: true, name: true, specimenType: true } },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: BULK_READ_LIMIT,
    });

    return orders.map((o) => ({
      id: o.id,
      clinicId: o.clinicId,
      labId: o.labId,
      status: o.status,
      notes: o.notes,
      resultUrl: o.resultUrl,
      resultUploadedAt: o.resultUploadedAt,
      collectedAt: o.collectedAt,
      completedAt: o.completedAt,
      paidAt: o.paidAt,
      paymentMethod: o.paymentMethod,
      releasedAt: o.releasedAt,
      createdAt: o.createdAt,
      patient: {
        id: o.patient.id,
        firstName: o.patient.firstName,
        lastName: o.patient.lastName,
        phoneNumber: o.patient.phoneNumber,
      },
      labTest: {
        id: o.labTest.id,
        name: o.labTest.name,
        specimenType: o.labTest.specimenType,
      },
    }));
  }

  async findReleaseContext(
    id: string,
    clinicId: string,
  ): Promise<LabOrderReleaseContext | null> {
    const order = await this.getReadClient().labTestOrder.findFirst({
      where: { id, clinicId },
      include: {
        labTest: { select: { name: true } },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            clinic: { select: { name: true } },
          },
        },
      },
    });

    if (!order) return null;

    return {
      id: order.id,
      clinicId: order.clinicId,
      status: order.status,
      resultUrl: order.resultUrl,
      paidAt: order.paidAt,
      testName: order.labTest.name,
      clinicName: order.patient.clinic?.name ?? '',
      patient: {
        id: order.patient.id,
        firstName: order.patient.firstName,
        lastName: order.patient.lastName,
        phoneNumber: order.patient.phoneNumber,
      },
    };
  }

  async markSampleCollected(
    id: string,
    clinicId: string,
    notes: string | undefined,
    now: Date,
  ): Promise<void> {
    await this.prisma.labTestOrder.updateMany({
      where: { id, clinicId },
      data: {
        status: LabTestOrderStatus.SAMPLE_COLLECTED,
        collectedAt: now,
        ...(notes !== undefined && { notes }),
      },
    });
  }

  // jscpd:ignore-start
  async attachResult(
    id: string,
    clinicId: string,
    data: {
      resultUrl: string;
      result?: Record<string, unknown>;
      notes?: string;
      uploadedBy: string;
    },
    now: Date,
  ): Promise<void> {
    // jscpd:ignore-end
    await this.prisma.labTestOrder.updateMany({
      where: { id, clinicId },
      data: {
        status: LabTestOrderStatus.RESULT_READY,
        resultUrl: data.resultUrl,
        resultUploadedBy: data.uploadedBy,
        resultUploadedAt: now,
        ...(data.result !== undefined && {
          result: toPrismaInputJsonValue(data.result),
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async verifyPayment(
    id: string,
    clinicId: string,
    data: { method: string; reference?: string; verifiedBy: string },
    now: Date,
  ): Promise<void> {
    await this.prisma.labTestOrder.updateMany({
      where: { id, clinicId },
      data: {
        paidAt: now,
        paymentVerifiedBy: data.verifiedBy,
        paymentMethod: data.method,
        ...(data.reference !== undefined && {
          paymentReference: data.reference,
        }),
      },
    });
  }

  async markReleased(id: string, clinicId: string, now: Date): Promise<void> {
    await this.prisma.labTestOrder.updateMany({
      where: { id, clinicId },
      data: {
        status: LabTestOrderStatus.COMPLETED,
        releasedAt: now,
        completedAt: now,
      },
    });
  }

  // --- Lab directory ---

  async findAllLabs(clinicId: string): Promise<LabRecord[]> {
    return await this.getReadClient().lab.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findLabById(id: string, clinicId: string): Promise<LabRecord | null> {
    return await this.getReadClient().lab.findFirst({
      // jscpd:ignore-start
      where: { id, clinicId },
    });
  }

  async createLab(
    clinicId: string,
    data: {
      name: string;
      type: LabType;
      phone?: string;
      email?: string;
      address?: string;
    },
  ): Promise<LabRecord> {
    return await this.prisma.lab.create({
      // jscpd:ignore-end
      data: {
        clinicId,
        name: data.name,
        type: data.type,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
      // jscpd:ignore-start
    });
  }

  async updateLab(
    id: string,
    clinicId: string,
    data: Partial<{
      name: string;
      type: LabType;
      phone: string;
      email: string;
      address: string;
      active: boolean;
    }>,
  ): Promise<LabRecord> {
    const result = await this.prisma.lab.updateMany({
      // jscpd:ignore-end
      where: { id, clinicId },
      data,
    });
    if (result.count === 0) throw new NotFoundException('Lab not found');
    const updated = await this.findLabById(id, clinicId);
    if (!updated) throw new NotFoundException('Lab not found');
    return updated;
  }
}
