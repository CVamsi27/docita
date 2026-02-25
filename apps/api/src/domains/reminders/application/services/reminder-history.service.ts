import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReminderSettings } from '@workspace/db';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderNotificationService } from './reminder-notification.service';

interface AppointmentForReminder {
  id: string;
  startTime: Date;
  type: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
  };
  doctor: {
    id: string;
    name: string;
  };
  clinic?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class ReminderHistoryService {
  private readonly logger = new Logger(ReminderHistoryService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: ReminderSettingsService,
    private notificationService: ReminderNotificationService,
  ) {}

  async getReminderHistory(clinicId: string, limit: number = 50) {
    return this.prisma.appointmentReminder.findMany({
      where: {
        appointment: {
          clinicId,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    } as any);
  }

  async sendManualReminder(
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp',
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const settings = await this.settingsService.getSettings();

    if (type === 'email') {
      await this.notificationService.sendEmailReminder(appointment, settings);
    } else if (type === 'sms') {
      await this.notificationService.sendSmsReminder(appointment, settings);
    } else if (type === 'whatsapp') {
      await this.notificationService.sendWhatsappReminder(
        appointment as AppointmentForReminder,
        settings,
        'appointment_reminder_24hr',
        'whatsapp_manual',
      );
    }

    return { success: true, message: `${type} reminder sent` };
  }
}
