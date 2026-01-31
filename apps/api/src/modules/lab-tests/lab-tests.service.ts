import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateLabTestOrderDto {
  patientId: string;
  labTestId: string;
  appointmentId?: string;
  notes?: string;
}

interface UpdateLabTestOrderDto {
  status?: string;
  result?: Record<string, unknown>;
  resultUrl?: string;
  notes?: string;
}

import { LabFactory } from './factories/lab.factory';

@Injectable()
export class LabTestsService {
  constructor(
    private prisma: PrismaService,
    private labFactory: LabFactory,
  ) {}

  // Lab Test Types/Catalog
  async findAllTests(clinicId: string) {
    if (!clinicId) {
      return [];
    }

    return this.prisma.labTest.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createTest(
    clinicId: string,
    data: {
      name: string;
      code?: string;
      category: string;
      price?: number;
      description?: string;
    },
  ) {
    const testData = this.labFactory.createTest({ ...data, clinicId });
    return this.prisma.labTest.create({
      data: testData,
    });
  }

  // Lab Test Orders
  async findAllOrders(clinicId: string) {
    if (!clinicId) {
      return [];
    }

    return this.prisma.labTestOrder.findMany({
      where: { clinicId },
      include: {
        labTest: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all lab test orders with patient and doctor details.
   * Optimized to minimize N+1 queries by using batch fetches.
   */
  async findAllOrdersWithPatients(
    clinicId: string,
    params?: { search?: string; status?: string; date?: string },
  ) {
    if (!clinicId) {
      return [];
    }

    const { search, status, date } = params || {};

    // Build the where clause incrementally
    type WhereClause = {
      clinicId: string;
      OR?: Array<{
        labTestId?: { in: string[] };
        patientId?: { in: string[] };
      }>;
      status?: string;
      createdAt?: { gte: Date; lte: Date };
    };
    const where: WhereClause = { clinicId };

    // Handle Search - batch query for matching IDs
    if (search) {
      // Parallel fetch for matching tests and patients
      const [matchingTests, matchingPatients] = await Promise.all([
        this.prisma.labTest.findMany({
          where: {
            clinicId,
            name: { contains: search, mode: 'insensitive' },
          },
          select: { id: true },
        }),
        this.prisma.patient.findMany({
          where: {
            clinicId,
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        }),
      ]);

      const matchingTestIds = matchingTests.map((t) => t.id);
      const matchingPatientIds = matchingPatients.map((p) => p.id);

      // Only add OR clause if there are matches
      if (matchingTestIds.length > 0 || matchingPatientIds.length > 0) {
        where.OR = [];
        if (matchingTestIds.length > 0) {
          where.OR.push({ labTestId: { in: matchingTestIds } });
        }
        if (matchingPatientIds.length > 0) {
          where.OR.push({ patientId: { in: matchingPatientIds } });
        }
      } else {
        // No matches found, return empty
        return [];
      }
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    // Fetch orders with included labTest relation
    const orders = await this.prisma.labTestOrder.findMany({
      where,
      include: { labTest: true },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      return [];
    }

    // Batch fetch patients and doctors in parallel
    const patientIds = [...new Set(orders.map((o) => o.patientId))];
    const doctorIds = [...new Set(orders.map((o) => o.orderedBy))];

    const [patients, doctors] = await Promise.all([
      this.prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      }),
      this.prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, name: true },
      }),
    ]);

    // Create lookup maps for O(1) access
    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

    // Map orders with related data
    return orders.map((order) => ({
      ...order,
      patient: patientMap.get(order.patientId),
      doctor: doctorMap.get(order.orderedBy),
    }));
  }

  async findOrder(id: string) {
    const order = await this.prisma.labTestOrder.findUnique({
      where: { id },
      include: {
        labTest: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab test order with ID ${id} not found`);
    }

    return order;
  }

  async createOrder(
    clinicId: string,
    userId: string,
    data: CreateLabTestOrderDto,
  ) {
    const orderData = this.labFactory.createOrder(data);
    return this.prisma.labTestOrder.create({
      data: {
        clinicId,
        orderedBy: userId,
        ...orderData,
      },
      include: {
        labTest: true,
      },
    });
  }

  async updateOrder(id: string, data: UpdateLabTestOrderDto) {
    const validatedUpdate = this.labFactory.updateOrder(data);
    const updateData: Record<string, unknown> = { ...validatedUpdate };

    if (data.status === 'sample_collected') {
      updateData.collectedAt = new Date();
    } else if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }

    return this.prisma.labTestOrder.update({
      where: { id },
      data: updateData,
      include: {
        labTest: true,
      },
    });
  }

  async getStats(clinicId: string) {
    if (!clinicId) {
      return { pending: 0, inProgress: 0, completed: 0, urgent: 0, total: 0 };
    }

    const orders = await this.prisma.labTestOrder.findMany({
      where: { clinicId },
    });

    return {
      pending: orders.filter((o) => o.status === 'ordered').length,
      inProgress: orders.filter((o) =>
        ['sample_collected', 'processing'].includes(o.status),
      ).length,
      completed: orders.filter((o) => o.status === 'completed').length,
      // For now, we'll count orders from today as potentially urgent
      urgent: orders.filter((o) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return o.createdAt >= today && o.status !== 'completed';
      }).length,
      total: orders.length,
    };
  }
}
