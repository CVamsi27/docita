import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
  EMAIL_PROVIDER,
} from './providers/email-provider.interface';
import { escapeHtml } from '@workspace/utils';

/**
 * Email service that abstracts email delivery through configurable providers.
 * Supports templated emails for common use cases.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
  ) {}

  /**
   * Send a registration welcome email.
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    clinicName: string,
  ): Promise<EmailSendResult> {
    const safeName = escapeHtml(name);
    const safeClinicName = escapeHtml(clinicName);

    return this.emailProvider.send({
      to: email,
      subject: `Welcome to Docita - ${safeClinicName}`,
      html: `
        <h1>Welcome, ${safeName}!</h1>
        <p>Your clinic <strong>${safeClinicName}</strong> has been successfully registered on Docita.</p>
        <p>You can now start managing your practice efficiently.</p>
        <p>
          <a href="${process.env.APP_URL || 'https://app.docita.work'}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Get Started
          </a>
        </p>
      `,
    });
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<EmailSendResult> {
    const resetUrl = `${process.env.APP_URL || 'https://app.docita.work'}/reset-password?token=${resetToken}`;

    return this.emailProvider.send({
      to: email,
      subject: 'Reset Your Password - Docita',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <p>
          <a href="${resetUrl}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p><small>This link expires in 1 hour. If you didn't request this, please ignore this email.</small></p>
      `,
    });
  }

  /**
   * Send an appointment reminder email.
   */
  async sendAppointmentReminder(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    clinicName: string,
  ): Promise<EmailSendResult> {
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const safePatientName = escapeHtml(patientName);
    const safeDoctorName = escapeHtml(doctorName);
    const safeClinicName = escapeHtml(clinicName);

    return this.emailProvider.send({
      to: email,
      subject: `Appointment Reminder - ${safeClinicName}`,
      html: `
        <h1>Appointment Reminder</h1>
        <p>Dear ${safePatientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Doctor:</strong> Dr. ${safeDoctorName}</li>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
          <li><strong>Clinic:</strong> ${safeClinicName}</li>
        </ul>
        <p>Please arrive 10 minutes before your scheduled time.</p>
      `,
    });
  }

  /**
   * Send a generic email.
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    return this.emailProvider.send(options);
  }

  /**
   * Send a templated email.
   */
  async sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    return this.emailProvider.sendTemplate(options);
  }

  /**
   * Verify email provider is configured.
   */
  async verifyProvider(): Promise<boolean> {
    try {
      return await this.emailProvider.verify();
    } catch (error) {
      this.logger.error('Email provider verification failed', error);
      return false;
    }
  }
}
