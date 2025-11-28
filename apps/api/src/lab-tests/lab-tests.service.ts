import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class LabTestsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.labTest.create({
      data: {
        clinicId,
        ...data,
      },
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

  async findAllOrdersWithPatients(clinicId: string) {
    if (!clinicId) {
      return [];
    }

    const orders = await this.prisma.labTestOrder.findMany({
      where: { clinicId },
      include: {
        labTest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get patient details
    const patientIds = orders.map((o) => o.patientId);
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });

    const patientMap = new Map(patients.map((p) => [p.id, p]));

    // Get doctor details (orderedBy)
    const doctorIds = orders.map((o) => o.orderedBy);
    const doctors = await this.prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: {
        id: true,
        name: true,
      },
    });

    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

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
    return this.prisma.labTestOrder.create({
      data: {
        clinicId,
        patientId: data.patientId,
        labTestId: data.labTestId,
        appointmentId: data.appointmentId,
        orderedBy: userId,
        notes: data.notes,
        status: 'ordered',
      },
      include: {
        labTest: true,
      },
    });
  }

  async updateOrder(id: string, data: UpdateLabTestOrderDto) {
    const updateData: Record<string, unknown> = { ...data };

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
