import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  REMINDER_PERSISTENCE_PORT,
  type ReminderPersistencePort,
} from '@/domains/reminders/application/ports/reminder-persistence.port';
import { ReminderSettings as _ReminderSettings } from '@workspace/db';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderNotificationService } from './reminder-notification.service';

@Injectable()
export class ReminderHistoryService {
  private readonly logger = new Logger(ReminderHistoryService.name);

  constructor(
    @Inject(REMINDER_PERSISTENCE_PORT)
    private persistence: ReminderPersistencePort,
    private settingsService: ReminderSettingsService,
    private notificationService: ReminderNotificationService,
  ) {}

  private static readonly MAX_PAGE_SIZE = 200;

  async getReminderHistory(clinicId: string, limit: number = 50) {
    const appointments = await this.persistence.appointment.findMany({
      where: { clinicId },
      select: { id: true },
    });

    const appointmentIds = appointments.map((appointment) => appointment.id);

    if (appointmentIds.length === 0) {
      return [];
    }

    const reminders = await this.persistence.appointmentReminder.findMany({
      where: {
        appointmentId: { in: appointmentIds },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return reminders;
  }

  async sendManualReminder(
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp',
    clinicId?: string,
  ) {
    const appointment = await this.persistence.appointment.findUnique({
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

    if (!appointment || (clinicId && appointment.clinicId !== clinicId)) {
      throw new NotFoundException('Appointment not found');
    }

    const settings = await this.settingsService.getSettings();

    if (type === 'email') {
      await this.notificationService.sendEmailReminder(appointment, settings);
    } else if (type === 'sms') {
      await this.notificationService.sendSmsReminder(appointment, settings);
    } else if (type === 'whatsapp') {
      await this.notificationService.sendWhatsappReminder(
        appointment,
        settings,
        'appointment_reminder_24hr',
        'whatsapp_manual',
      );
    }

    return { success: true, message: `${type} reminder sent` };
  }
}
