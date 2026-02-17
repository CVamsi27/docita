import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueTokenStatus } from '@workspace/db';

interface AuthUser {
  id: string;
  clinicId: string;
  role: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all queue tokens for today, optionally filtered by doctor and search.
   */
  async findAll(clinicId: string, filters?: { doctorId?: string; search?: string }) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      clinicId,
      createdAt: { gte: todayStart, lte: todayEnd },
    };

    if (filters?.doctorId) {
      where.doctorId = filters.doctorId;
    }

    if (filters?.search) {
      where.patient = {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { phoneNumber: { contains: filters.search } },
        ],
      };
    }

    return this.prisma.queueToken.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { id: true, name: true } },
        appointment: {
          select: {
            id: true,
            doctor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get queue statistics for today.
   */
  async getStats(clinicId: string, filters?: { doctorId?: string; search?: string }) {
    const tokens = await this.findAll(clinicId, filters);

    const stats = {
      waiting: 0,
      inProgress: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      total: tokens.length,
      scheduled: 0,
      walkIns: 0,
      lateArrivals: 0,
      avgWaitTime: 0,
    };

    let totalWaitTime = 0;
    let waitCount = 0;

    for (const token of tokens) {
      switch (token.status) {
        case QueueTokenStatus.WAITING:
          stats.waiting++;
          break;
        case QueueTokenStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case QueueTokenStatus.COMPLETED:
          stats.completed++;
          break;
        case QueueTokenStatus.CANCELLED:
          stats.cancelled++;
          break;
      }

      switch (token.tokenType) {
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'walk-in':
          stats.walkIns++;
          break;
        case 'late-arrival':
          stats.lateArrivals++;
          break;
      }

      if (token.calledAt && token.createdAt) {
        const wait = (new Date(token.calledAt).getTime() - new Date(token.createdAt).getTime()) / 60000;
        totalWaitTime += wait;
        waitCount++;
      }
    }

    stats.avgWaitTime = waitCount > 0 ? Math.round(totalWaitTime / waitCount) : 0;

    return stats;
  }

  /**
   * Get queue settings from clinic record.
   */
  async getSettings(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        queueBufferMinutes: true,
        useDoctorQueues: true,
        lateArrivalGraceMinutes: true,
        avgConsultationMinutes: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }

  /**
   * Update queue settings on the clinic record.
   */
  async updateSettings(
    clinicId: string,
    data: {
      queueBufferMinutes?: number;
      useDoctorQueues?: boolean;
      lateArrivalGraceMinutes?: number;
      avgConsultationMinutes?: number;
    },
  ) {
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data,
      select: {
        queueBufferMinutes: true,
        useDoctorQueues: true,
        lateArrivalGraceMinutes: true,
        avgConsultationMinutes: true,
      },
    });
  }

  /**
   * Create a new queue token.
   */
  async createToken(
    clinicId: string,
    data: {
      patientId: string;
      appointmentId?: string;
      doctorId?: string;
      priority?: number;
      notes?: string;
    },
  ) {
    // Get the next token number for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastToken = await this.prisma.queueToken.findFirst({
      where: {
        clinicId,
        createdAt: { gte: todayStart },
      },
      orderBy: { tokenNumber: 'desc' },
    });

    const tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;

    const tokenType = data.appointmentId ? 'scheduled' : 'walk-in';

    return this.prisma.queueToken.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        doctorId: data.doctorId,
        tokenNumber,
        priority: data.priority ?? 0,
        notes: data.notes,
        tokenType,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Update a queue token (status, priority, notes).
   */
  async updateToken(
    id: string,
    clinicId: string,
    data: { status?: string; priority?: number; notes?: string },
  ) {
    const token = await this.prisma.queueToken.findFirst({
      where: { id, clinicId },
    });

    if (!token) {
      throw new NotFoundException('Queue token not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) {
      updateData.status = data.status as QueueTokenStatus;
      if (data.status === 'IN_PROGRESS') {
        updateData.calledAt = new Date();
        updateData.consultationStart = new Date();
      } else if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.consultationEnd = new Date();
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.queueToken.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Check in an appointment — creates a queue token for an existing appointment.
   */
  async checkIn(appointmentId: string, clinicId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: { id: true, patientId: true, doctorId: true, clinicId: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if token already exists
    const existing = await this.prisma.queueToken.findUnique({
      where: { appointmentId },
    });

    if (existing) {
      return existing;
    }

    return this.createToken(clinicId, {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
    });
  }

  /**
   * Create a walk-in queue token (creates patient if needed).
   */
  async createWalkIn(
    clinicId: string,
    data: { patientName: string; phoneNumber: string; reason?: string },
  ) {
    // Find or create patient by phone number
    let patient = await this.prisma.patient.findFirst({
      where: { clinicId, phoneNumber: data.phoneNumber },
    });

    if (!patient) {
      const nameParts = data.patientName.trim().split(/\s+/);
      const firstName = nameParts[0] || data.patientName;
      const lastName = nameParts.slice(1).join(' ') || '';

      patient = await this.prisma.patient.create({
        data: {
          clinicId,
          firstName,
          lastName,
          phoneNumber: data.phoneNumber,
          dateOfBirth: new Date('1990-01-01'), // Placeholder
          gender: 'OTHER',
        },
      });
    }

    return this.createToken(clinicId, {
      patientId: patient.id,
      notes: data.reason,
    });
  }

  /**
   * Call the next waiting patient in the queue.
   */
  async callNext(clinicId: string, doctorId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where: Record<string, unknown> = {
      clinicId,
      status: QueueTokenStatus.WAITING,
      createdAt: { gte: todayStart },
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    const nextToken = await this.prisma.queueToken.findFirst({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!nextToken) {
      return { message: 'No patients waiting in queue' };
    }

    return this.updateToken(nextToken.id, clinicId, { status: 'IN_PROGRESS' });
  }

  /**
   * Get estimated wait time for a specific token.
   */
  async getEstimatedWaitTime(tokenId: string, clinicId: string) {
    const token = await this.prisma.queueToken.findFirst({
      where: { id: tokenId, clinicId },
    });

    if (!token) {
      throw new NotFoundException('Queue token not found');
    }

    // Get clinic settings for average consultation time
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { avgConsultationMinutes: true },
    });

    const avgMinutes = clinic?.avgConsultationMinutes ?? 15;

    // Count tokens ahead
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tokensAhead = await this.prisma.queueToken.count({
      where: {
        clinicId,
        status: QueueTokenStatus.WAITING,
        createdAt: { gte: todayStart },
        OR: [
          { priority: { gt: token.priority } },
          {
            priority: token.priority,
            createdAt: { lt: token.createdAt },
          },
        ],
      },
    });

    // Also count in-progress (they're being served)
    const inProgress = await this.prisma.queueToken.count({
      where: {
        clinicId,
        status: QueueTokenStatus.IN_PROGRESS,
        createdAt: { gte: todayStart },
      },
    });

    const position = tokensAhead + 1;
    // Estimate: tokens ahead * avg time, minus active consultations (they'll finish sooner)
    const estimatedMinutes = Math.max(0, (tokensAhead - inProgress) * avgMinutes);

    return {
      estimatedMinutes,
      position,
      tokensAhead,
    };
  }
}
