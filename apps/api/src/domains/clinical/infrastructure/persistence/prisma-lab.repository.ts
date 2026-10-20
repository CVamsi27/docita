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
  LabNotificationClaim,
  LabOrderReleaseContext,
  LabQueueItem,
  LabReleaseClaim,
} from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import type { LabRecord } from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import {
  LabTestOrderStatus,
  LabResultNotificationStatus,
  LabType,
  Prisma,
  LabTest as PrismaLabTest,
  LabTestOrder as PrismaLabTestOrder,
} from '@workspace/db';

/**
 * Statuses an order can still be released from. COMPLETED/CANCELLED are
 * terminal, so a release claim predicated on these can only ever win once.
 */
const RELEASABLE_STATUSES: LabTestOrderStatus[] = [
  LabTestOrderStatus.ORDERED,
  LabTestOrderStatus.SAMPLE_COLLECTED,
  LabTestOrderStatus.PENDING,
  LabTestOrderStatus.RESULT_READY,
];

/** Notification states a delivery claim may take from. */
const CLAIMABLE_NOTIFICATION_STATUSES: LabResultNotificationStatus[] = [
  LabResultNotificationStatus.NOT_ATTEMPTED,
  LabResultNotificationStatus.FAILED,
];

/** Notification states that mean delivery is settled and must never re-run. */
const SETTLED_NOTIFICATION_STATUSES: LabResultNotificationStatus[] = [
  LabResultNotificationStatus.SENT,
  LabResultNotificationStatus.SKIPPED_NO_CONTACT,
];

/** Failure text kept for operator triage; never the message body. */
const NOTIFICATION_ERROR_MAX_LENGTH = 300;

/**
 * Rows a delivery attempt may take: never-attempted/retryable states, or a
 * SENDING row whose lease expired because the worker holding it died mid-send.
 * Shared by the claim and the sweep so "claimable" cannot drift between them.
 */
function claimableNotificationWhere(leaseExpiredBefore: Date) {
  return {
    OR: [
      {
        resultNotificationStatus: {
          in: CLAIMABLE_NOTIFICATION_STATUSES,
        },
      },
      {
        resultNotificationStatus: LabResultNotificationStatus.SENDING,
        resultNotificationClaimedAt: { lt: leaseExpiredBefore },
      },
    ],
  };
}

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

  async findTestById(id: string, clinicId: string): Promise<LabTest | null> {
    // Tenant-scoped read: the scope policy rejects `findUnique` keyed on id
    // alone, so use a tenant-qualified findFirst.
    const test = await this.getReadClient().labTest.findFirst({
      where: { id, clinicId },
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

    // The tenant-scope policy rejects `upsert`/`update` keyed on `id` alone;
    // use the tenant-qualified findFirst + create/updateMany pattern instead.
    const existing = labTest.id
      ? await this.prisma.labTest.findFirst({
          where: { id: labTest.id, clinicId: labTest.clinicId },
        })
      : null;

    if (existing) {
      const result = await this.prisma.labTest.updateMany({
        where: { id: existing.id, clinicId: labTest.clinicId },
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException('Lab test not found');
      }
      const updated = await this.prisma.labTest.findFirst({
        where: { id: existing.id, clinicId: labTest.clinicId },
      });
      if (!updated) {
        throw new NotFoundException('Lab test not found');
      }
      return this.mapToLabTest(updated);
    }

    const created = await this.prisma.labTest.create({
      data: { ...data, id: labTest.id || undefined },
    });
    return this.mapToLabTest(created);
  }

  async deleteTest(id: string, clinicId: string): Promise<void> {
    // Tenant-scoped delete: the scope policy rejects `delete` keyed on id
    // alone; deleteMany keeps clinicId in the where.
    const result = await this.prisma.labTest.deleteMany({
      where: { id, clinicId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Lab test not found');
    }
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

  async findOrderById(id: string, clinicId: string): Promise<LabOrder | null> {
    // Tenant-scoped read: the scope policy rejects `findUnique` keyed on id
    // alone, so use a tenant-qualified findFirst.
    const order = await this.getReadClient().labTestOrder.findFirst({
      where: { id, clinicId },
      include: { labTest: true },
    });

    if (!order) return null;
    return this.mapToLabOrder(order, {
      labTest: order.labTest ? this.labTestRelation(order.labTest) : undefined,
    });
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

    // The tenant-scope policy rejects `upsert`/`update` keyed on `id` alone;
    // use the tenant-qualified findFirst + create/updateMany pattern instead.
    const existing = order.id
      ? await this.prisma.labTestOrder.findFirst({
          where: { id: order.id, clinicId: order.clinicId },
          include: { labTest: true },
        })
      : null;

    if (existing) {
      const result = await this.prisma.labTestOrder.updateMany({
        where: { id: existing.id, clinicId: order.clinicId },
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException('Lab order not found');
      }
      const updated = await this.prisma.labTestOrder.findFirst({
        where: { id: existing.id, clinicId: order.clinicId },
        include: { labTest: true },
      });
      if (!updated) {
        throw new NotFoundException('Lab order not found');
      }
      return this.mapToLabOrder(updated, {
        labTest: updated.labTest
          ? this.labTestRelation(updated.labTest)
          : undefined,
      });
    }

    const created = await this.prisma.labTestOrder.create({
      data: { ...data, id: order.id || undefined },
      include: { labTest: true },
    });
    return this.mapToLabOrder(created, {
      labTest: created.labTest
        ? this.labTestRelation(created.labTest)
        : undefined,
    });
  }

  async deleteOrder(id: string, clinicId: string): Promise<void> {
    // Tenant-scoped delete: the scope policy rejects `delete` keyed on id
    // alone; deleteMany keeps clinicId in the where.
    const result = await this.prisma.labTestOrder.deleteMany({
      where: { id, clinicId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Lab order not found');
    }
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

  private labTestRelation(
    row: Pick<PrismaLabTest, 'id' | 'name' | 'category' | 'code' | 'price'>,
  ): {
    id: string;
    name: string;
    category: string;
    code?: string;
    price?: number;
  } {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      code: row.code ?? undefined,
      price: row.price ?? undefined,
    };
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
      resultNotificationStatus: o.resultNotificationStatus,
      resultNotificationAttempts: o.resultNotificationAttempts,
      resultNotifiedAt: o.resultNotifiedAt,
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
      releasedAt: order.releasedAt,
      resultNotificationStatus: order.resultNotificationStatus,
      resultNotificationAttempts: order.resultNotificationAttempts,
      patient: {
        id: order.patient.id,
        firstName: order.patient.firstName,
        lastName: order.patient.lastName,
        phoneNumber: order.patient.phoneNumber,
      },
    };
  }

  /**
   * Releases under a fencing token.
   *
   * The predicate is the whole guarantee: a non-terminal status AND no active
   * claim. Two callers racing on the same row produce exactly one `count === 1`,
   * so the loser knows its notification must not be sent.
   */
  async claimRelease(claim: LabReleaseClaim): Promise<boolean> {
    const result = await this.prisma.labTestOrder.updateMany({
      where: {
        id: claim.id,
        clinicId: claim.clinicId,
        status: { in: RELEASABLE_STATUSES },
        releaseClaimToken: null,
      },
      data: {
        status: LabTestOrderStatus.COMPLETED,
        releasedAt: claim.now,
        completedAt: claim.now,
        releaseClaimToken: claim.claimToken,
        releasedBy: claim.releasedBy,
      },
    });
    return result.count === 1;
  }

  /**
   * Claims delivery of the result notification.
   *
   * Takes an expired SENDING lease so a process that died mid-send does not
   * strand the patient, but never takes a live claim from another worker and
   * never re-sends an already-settled notification.
   */
  async claimResultNotification(
    claim: LabNotificationClaim,
    leaseExpiredBefore: Date,
  ): Promise<boolean> {
    const result = await this.prisma.labTestOrder.updateMany({
      where: {
        id: claim.id,
        clinicId: claim.clinicId,
        releasedAt: { not: null },
        // Excludes SETTLED rows before the OR below, so a released order that
        // already sent never re-enters the claimable set.
        resultNotificationStatus: {
          in: [
            ...CLAIMABLE_NOTIFICATION_STATUSES,
            LabResultNotificationStatus.SENDING,
          ],
        },
        ...claimableNotificationWhere(leaseExpiredBefore),
      },
      data: {
        resultNotificationStatus: LabResultNotificationStatus.SENDING,
        resultNotificationClaimToken: claim.claimToken,
        resultNotificationClaimedAt: claim.now,
        resultNotificationAttempts: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async completeResultNotification(
    id: string,
    clinicId: string,
    claimToken: string,
    outcome: {
      status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CONTACT';
      now: Date;
      error?: string;
    },
  ): Promise<void> {
    await this.prisma.labTestOrder.updateMany({
      where: {
        id,
        clinicId,
        resultNotificationClaimToken: claimToken,
        resultNotificationStatus: LabResultNotificationStatus.SENDING,
      },
      data: {
        resultNotificationStatus: outcome.status,
        // The lease is cleared so the row never reads as in-flight forever.
        resultNotificationClaimToken: null,
        resultNotificationClaimedAt: null,
        resultNotifiedAt: outcome.status === 'SENT' ? outcome.now : null,
        resultNotificationLastError: outcome.error
          ? outcome.error.slice(0, NOTIFICATION_ERROR_MAX_LENGTH)
          : null,
      },
    });
  }

  /** Released orders whose notification still needs a delivery attempt. */
  async findPendingResultNotifications(
    leaseExpiredBefore: Date,
    limit: number,
  ): Promise<Array<{ id: string; clinicId: string }>> {
    return this.getReadClient().labTestOrder.findMany({
      where: {
        releasedAt: { not: null },
        ...claimableNotificationWhere(leaseExpiredBefore),
      },
      select: { id: true, clinicId: true },
      orderBy: { releasedAt: 'asc' },
      take: limit,
    });
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

  /** Orders released before the claim protocol existed; kept for read paths. */
  async releaseStatusCounts(clinicId: string): Promise<{
    released: number;
    notified: number;
    outstanding: number;
  }> {
    const rows = await this.getReadClient().labTestOrder.groupBy({
      by: ['resultNotificationStatus'],
      where: { clinicId, releasedAt: { not: null } },
      _count: { id: true },
    });
    const settled = new Set<LabResultNotificationStatus>(
      SETTLED_NOTIFICATION_STATUSES,
    );
    let notified = 0;
    let outstanding = 0;
    for (const row of rows) {
      if (settled.has(row.resultNotificationStatus)) {
        notified += row._count.id;
      } else {
        outstanding += row._count.id;
      }
    }
    return {
      released: notified + outstanding,
      notified,
      outstanding,
    };
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
