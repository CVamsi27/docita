import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

interface CreateQueueTokenDto {
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  priority?: number;
  notes?: string;
}

interface UpdateQueueTokenDto {
  status?: string;
  priority?: number;
  notes?: string;
}

interface QueueSettings {
  queueBufferMinutes: number;
  useDoctorQueues: boolean;
  lateArrivalGraceMinutes: number;
  avgConsultationMinutes: number;
}

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  // ============================================================================
  // Queue Settings
  // ============================================================================

  async getQueueSettings(clinicId: string): Promise<QueueSettings> {
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

  async updateQueueSettings(
    clinicId: string,
    settings: Partial<QueueSettings>,
  ): Promise<QueueSettings> {
    const clinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: settings,
      select: {
        queueBufferMinutes: true,
        useDoctorQueues: true,
        lateArrivalGraceMinutes: true,
        avgConsultationMinutes: true,
      },
    });

    return clinic;
  }

  // ============================================================================
  // Core Queue Operations
  // ============================================================================

  private getTodayRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
  }

  private async getNextTokenNumber(clinicId: string): Promise<number> {
    const { today, tomorrow } = this.getTodayRange();

    const lastToken = await this.prisma.queueToken.findFirst({
      where: {
        clinicId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { tokenNumber: 'desc' },
    });

    return (lastToken?.tokenNumber || 0) + 1;
  }

  async findAll(clinicId: string, doctorId?: string) {
    if (!clinicId) {
      return [];
    }

    const { today, tomorrow } = this.getTodayRange();
    const settings = await this.getQueueSettings(clinicId);

    const where: Record<string, unknown> = {
      clinicId,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    };

    // Filter by doctor if doctor-specific queues are enabled
    if (settings.useDoctorQueues && doctorId) {
      where.doctorId = doctorId;
    }

    return this.prisma.queueToken.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { scheduledTime: 'asc' },
        { tokenNumber: 'asc' },
      ],
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
            type: true,
          },
        },
      },
    });
  }

  async findAllWithPatients(clinicId: string, doctorId?: string) {
    return this.findAll(clinicId, doctorId);
  }

  async findOne(id: string) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        appointment: true,
      },
    });

    if (!token) {
      throw new NotFoundException(`Queue token with ID ${id} not found`);
    }

    return token;
  }

  // ============================================================================
  // Walk-in Patient
  // ============================================================================

  async addWalkIn(clinicId: string, data: CreateQueueTokenDto) {
    const tokenNumber = await this.getNextTokenNumber(clinicId);
    const settings = await this.getQueueSettings(clinicId);

    return this.prisma.queueToken.create({
      data: {
        clinicId,
        patientId: data.patientId,
        doctorId: data.doctorId || null,
        tokenNumber,
        priority: data.priority || 0,
        notes: data.notes,
        status: 'waiting',
        tokenType: 'walk-in',
        scheduledTime: null,
        estimatedDuration: settings.avgConsultationMinutes,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  // Legacy create method - now calls addWalkIn
  async create(clinicId: string, data: CreateQueueTokenDto) {
    return this.addWalkIn(clinicId, data);
  }

  // ============================================================================
  // Check-in Scheduled Appointment
  // ============================================================================

  async checkInAppointment(clinicId: string, appointmentId: string) {
    // Get the appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
        queueToken: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Security check: ensure appointment belongs to the clinic
    if (appointment.clinicId !== clinicId) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.queueToken) {
      throw new BadRequestException('Appointment already checked in');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Cannot check in a cancelled appointment');
    }

    const settings = await this.getQueueSettings(appointment.clinicId);
    const now = new Date();
    const scheduledTime = new Date(appointment.startTime);

    // Calculate if patient is late
    const lateThreshold = new Date(scheduledTime);
    lateThreshold.setMinutes(
      lateThreshold.getMinutes() + settings.lateArrivalGraceMinutes,
    );

    const isLate = now > lateThreshold;
    const tokenType = isLate ? 'late-arrival' : 'scheduled';

    const tokenNumber = await this.getNextTokenNumber(appointment.clinicId);

    // Create queue token
    const queueToken = await this.prisma.queueToken.create({
      data: {
        clinicId: appointment.clinicId,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        tokenNumber,
        priority: 0,
        status: 'waiting',
        tokenType,
        // If late, treat as walk-in (no scheduled time priority)
        scheduledTime: isLate ? null : scheduledTime,
        estimatedDuration: settings.avgConsultationMinutes,
        notes: isLate
          ? `Late arrival (scheduled: ${scheduledTime.toLocaleTimeString()})`
          : null,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update appointment status to confirmed
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'confirmed' },
    });

    return queueToken;
  }

  // ============================================================================
  // Update Queue Token & Status Sync
  // ============================================================================

  async update(id: string, data: UpdateQueueTokenDto) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id },
      include: { appointment: true },
    });

    if (!token) {
      throw new NotFoundException('Queue token not found');
    }

    const updateData: Record<string, unknown> = { ...data };
    const now = new Date();

    // Handle status changes
    if (data.status === 'in-progress') {
      updateData.calledAt = now;
      updateData.consultationStart = now;

      // Sync with appointment
      if (token.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: token.appointmentId },
          data: { status: 'in-progress' },
        });
      }
    } else if (data.status === 'completed') {
      updateData.completedAt = now;
      updateData.consultationEnd = now;

      // Calculate actual consultation duration
      if (token.consultationStart) {
        const startTime = new Date(token.consultationStart);
        const durationMinutes = Math.round(
          (now.getTime() - startTime.getTime()) / 60000,
        );
        updateData.estimatedDuration = durationMinutes;

        // Update clinic's average consultation time (rolling average)
        await this.updateAvgConsultationTime(token.clinicId, durationMinutes);
      }

      // Sync with appointment
      if (token.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: token.appointmentId },
          data: { status: 'completed' },
        });
      }
    } else if (data.status === 'no-show') {
      updateData.completedAt = now;

      // Sync with appointment
      if (token.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: token.appointmentId },
          data: { status: 'no-show' },
        });
      }
    } else if (data.status === 'cancelled') {
      updateData.completedAt = now;

      // Sync with appointment
      if (token.appointmentId) {
        await this.prisma.appointment.update({
          where: { id: token.appointmentId },
          data: { status: 'cancelled' },
        });
      }
    }

    return this.prisma.queueToken.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private async updateAvgConsultationTime(
    clinicId: string,
    newDuration: number,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { avgConsultationMinutes: true },
    });

    if (clinic) {
      // Rolling average with weight towards recent consultations
      const currentAvg = clinic.avgConsultationMinutes;
      const newAvg = Math.round(currentAvg * 0.7 + newDuration * 0.3);

      await this.prisma.clinic.update({
        where: { id: clinicId },
        data: { avgConsultationMinutes: newAvg },
      });
    }
  }

  // ============================================================================
  // Call Next Patient
  // ============================================================================

  async callNext(clinicId: string, doctorId?: string) {
    const { today, tomorrow } = this.getTodayRange();
    const settings = await this.getQueueSettings(clinicId);
    const now = new Date();

    const where: Record<string, unknown> = {
      clinicId,
      status: 'waiting',
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    };

    // Filter by doctor if specified or if doctor queues are enabled
    if (settings.useDoctorQueues && doctorId) {
      where.doctorId = doctorId;
    }

    // First, check for scheduled appointments within buffer time
    const bufferStart = new Date(now);
    bufferStart.setMinutes(
      bufferStart.getMinutes() - settings.queueBufferMinutes,
    );
    const bufferEnd = new Date(now);
    bufferEnd.setMinutes(bufferEnd.getMinutes() + settings.queueBufferMinutes);

    // Try to find a scheduled patient within buffer window
    const scheduledToken = await this.prisma.queueToken.findFirst({
      where: {
        ...where,
        scheduledTime: {
          gte: bufferStart,
          lte: bufferEnd,
        },
      },
      orderBy: [{ priority: 'desc' }, { scheduledTime: 'asc' }],
    });

    if (scheduledToken) {
      return this.update(scheduledToken.id, { status: 'in-progress' });
    }

    // No scheduled patients in buffer, serve walk-ins by token number
    const walkInToken = await this.prisma.queueToken.findFirst({
      where: {
        ...where,
        OR: [{ scheduledTime: null }, { tokenType: 'late-arrival' }],
      },
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
    });

    if (walkInToken) {
      return this.update(walkInToken.id, { status: 'in-progress' });
    }

    // Check for any remaining scheduled patients (past their time)
    const anyWaiting = await this.prisma.queueToken.findFirst({
      where,
      orderBy: [
        { priority: 'desc' },
        { scheduledTime: 'asc' },
        { tokenNumber: 'asc' },
      ],
    });

    if (anyWaiting) {
      return this.update(anyWaiting.id, { status: 'in-progress' });
    }

    return null;
  }

  // ============================================================================
  // Estimated Wait Time
  // ============================================================================

  async getEstimatedWaitTime(tokenId: string): Promise<number> {
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
    });

    if (!token || token.status !== 'waiting') {
      return 0;
    }

    const settings = await this.getQueueSettings(token.clinicId);
    const { today, tomorrow } = this.getTodayRange();

    // Count patients ahead in queue
    const patientsAhead = await this.prisma.queueToken.count({
      where: {
        clinicId: token.clinicId,
        status: 'waiting',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        OR: [
          // Higher priority patients
          { priority: { gt: token.priority } },
          // Same priority but earlier token/scheduled time
          {
            priority: token.priority,
            tokenNumber: { lt: token.tokenNumber },
          },
        ],
      },
    });

    // Count in-progress patients
    const inProgress = await this.prisma.queueToken.count({
      where: {
        clinicId: token.clinicId,
        status: 'in-progress',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Calculate estimated wait time
    const estimatedWait =
      (patientsAhead + (inProgress > 0 ? 0.5 : 0)) *
      settings.avgConsultationMinutes;

    return Math.round(estimatedWait);
  }

  async getQueueWithWaitTimes(clinicId: string, doctorId?: string) {
    const tokens = await this.findAll(clinicId, doctorId);

    // Calculate wait times for waiting patients
    const tokensWithWait = await Promise.all(
      tokens.map(async (token) => {
        if (token.status === 'waiting') {
          const estimatedWaitTime = await this.getEstimatedWaitTime(token.id);
          return { ...token, estimatedWaitTime };
        }
        return token;
      }),
    );

    return tokensWithWait;
  }

  // ============================================================================
  // Stats
  // ============================================================================

  async getStats(clinicId: string, doctorId?: string) {
    const { today, tomorrow } = this.getTodayRange();
    const settings = await this.getQueueSettings(clinicId);

    const where: Record<string, unknown> = {
      clinicId,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (settings.useDoctorQueues && doctorId) {
      where.doctorId = doctorId;
    }

    const tokens = await this.prisma.queueToken.findMany({ where });

    const scheduled = tokens.filter((t) => t.tokenType === 'scheduled');
    const walkIns = tokens.filter((t) => t.tokenType === 'walk-in');
    const lateArrivals = tokens.filter((t) => t.tokenType === 'late-arrival');

    return {
      waiting: tokens.filter((t) => t.status === 'waiting').length,
      inProgress: tokens.filter((t) => t.status === 'in-progress').length,
      completed: tokens.filter((t) => t.status === 'completed').length,
      noShow: tokens.filter((t) => t.status === 'no-show').length,
      cancelled: tokens.filter((t) => t.status === 'cancelled').length,
      total: tokens.length,
      scheduled: scheduled.length,
      walkIns: walkIns.length,
      lateArrivals: lateArrivals.length,
      avgConsultationMinutes: settings.avgConsultationMinutes,
    };
  }

  // ============================================================================
  // Today's Appointments for Check-in
  // ============================================================================

  async getTodaysAppointmentsForCheckIn(clinicId: string, doctorId?: string) {
    const { today, tomorrow } = this.getTodayRange();

    const where: Record<string, unknown> = {
      clinicId,
      startTime: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ['scheduled', 'confirmed'] },
      queueToken: null, // Not yet checked in
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // ============================================================================
  // ✅ OPTIMIZATION: Async Job Processing using Bull
  // ============================================================================

  /**
   * Queue analytics update as background job to prevent blocking request
   * @param clinicId - Clinic identifier
   */
  async queueAnalyticsUpdate(clinicId: string) {
    await this.analyticsQueue.add(
      'update-stats',
      { clinicId },
      {
        priority: 5,
        removeOnComplete: true,
      },
    );
  }

  /**
   * Queue notification sending for patients
   * @param patientId - Patient identifier
   * @param message - Notification message
   */
  async queuePatientNotification(patientId: string, message: string) {
    await this.notificationsQueue.add(
      'send-to-patient',
      { patientId, message },
      {
        priority: 3,
        removeOnComplete: true,
      },
    );
  }
}
