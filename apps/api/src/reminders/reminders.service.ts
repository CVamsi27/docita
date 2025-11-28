/* eslint-disable */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private prisma: PrismaService) { }

  async getSettings() {
    // Get the first (and only) settings record, or create default
    let settings = await this.prisma.reminderSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.reminderSettings.create({
        data: {
          enabled: true,
          smsEnabled: false,
          emailEnabled: true,
          hoursBeforeAppt: 24,
          emailSubject: 'Appointment Reminder - {clinicName}',
          emailTemplate: `Dear {patientName},

This is a friendly reminder about your upcoming appointment:

Date & Time: {appointmentDate} at {appointmentTime}
Doctor: Dr. {doctorName}
Type: {appointmentType}

Please arrive 10 minutes early. If you need to reschedule, please contact us.

Thank you,
{clinicName}`,
          smsTemplate:
            'Reminder: You have an appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}. - {clinicName}',
        },
      });
    }

    return settings;
  }

  async updateSettings(data: any) {
    const existing = await this.getSettings();
    return this.prisma.reminderSettings.update({
      where: { id: existing.id },
      data,
    });
  }

  // Cron job to check and send reminders every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndSendReminders() {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      this.logger.log('Reminders are disabled');
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + settings.hoursBeforeAppt * 60 * 60 * 1000,
    );

    // Find appointments that need reminders
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: reminderTime,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    this.logger.log(
      `Found ${appointments.length} appointments needing reminders`,
    );

    for (const appointment of appointments) {
      // Check if reminder already sent
      const existingReminder = await this.prisma.appointmentReminder.findFirst({
        where: {
          appointmentId: appointment.id,
          status: 'sent',
        },
      });

      if (existingReminder) {
        continue; // Already sent
      }

      // Send email reminder
      if (settings.emailEnabled && appointment.patient.email) {
        await this.sendEmailReminder(appointment, settings);
      }

      // Send SMS reminder
      if (settings.smsEnabled && appointment.patient.phoneNumber) {
        await this.sendSmsReminder(appointment, settings);
      }
    }
  }

  private async sendEmailReminder(appointment: any, settings: any) {
    try {
      // Replace placeholders in template
      const message = this.replacePlaceholders(
        settings.emailTemplate,
        appointment,
      );
      const subject = this.replacePlaceholders(
        settings.emailSubject,
        appointment,
      );

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      this.logger.log(`[EMAIL] To: ${appointment.patient.email}`);
      this.logger.log(`[EMAIL] Subject: ${subject}`);
      this.logger.log(`[EMAIL] Message: ${message}`);

      // Log the reminder
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email reminder: ${error.message}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  private async sendSmsReminder(appointment: any, settings: any) {
    try {
      const message = this.replacePlaceholders(
        settings.smsTemplate,
        appointment,
      );

      // TODO: Integrate with Twilio or other SMS service
      this.logger.log(`[SMS] To: ${appointment.patient.phoneNumber}`);
      this.logger.log(`[SMS] Message: ${message}`);

      // Log the reminder
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`SMS reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS reminder: ${error.message}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  private replacePlaceholders(template: string, appointment: any): string {
    const date = new Date(appointment.startTime);

    return template
      .replace(
        /{patientName}/g,
        `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      )
      .replace(/{doctorName}/g, appointment.doctor.name)
      .replace(/{appointmentDate}/g, date.toLocaleDateString())
      .replace(
        /{appointmentTime}/g,
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      )
      .replace(/{appointmentType}/g, appointment.type)
      .replace(/{clinicName}/g, 'Your Clinic'); // TODO: Get from settings
  }

  async getReminderHistory(limit: number = 50) {
    return this.prisma.appointmentReminder.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendManualReminder(appointmentId: string, type: 'email' | 'sms') {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const settings = await this.getSettings();

    if (type === 'email') {
      await this.sendEmailReminder(appointment, settings);
    } else {
      await this.sendSmsReminder(appointment, settings);
    }

    return { success: true, message: `${type} reminder sent` };
  }
}
