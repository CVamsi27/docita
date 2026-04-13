import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
  EMAIL_PROVIDER,
} from './providers/email-provider.interface';
import { escapeHtml } from '@workspace/utils';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly supportEmail = 'support@docita.work';

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    private configService: AppConfigService,
  ) {}

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
          <a href="${this.configService.getAppUrl()}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Get Started
          </a>
        </p>
      `,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<EmailSendResult> {
    const resetUrl = `${this.configService.getAppUrl()}/reset-password?token=${resetToken}`;

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

  async sendVerificationEmail(
    email: string,
    _name: string,
    verificationToken: string,
  ): Promise<EmailSendResult> {
    const verifyUrl = `${this.configService.getAppUrl()}/verify-email?token=${verificationToken}`;

    return this.emailProvider.send({
      to: email,
      subject: 'Verify Your Email - Docita',
      replyTo: this.supportEmail,
      html: `
        <div style="margin:0; padding:32px 16px; background:#f8fafc; color:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:420px; margin:0 auto; background:#ffffff; border:1px solid #dbe4f0; border-radius:16px; padding:32px 24px; text-align:center;">
            <p style="margin:0 0 16px; font-size:34px; line-height:1; font-weight:700;">Verified</p>
            <a href="${verifyUrl}"
               style="display:inline-block; background:#0f766e; color:#ffffff; padding:14px 24px; border-radius:12px; text-decoration:none; font-weight:600;">
              Verify email
            </a>
            <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#475569;">
              Regards,<br />
              Docita Care Team
            </p>
          </div>
        </div>
      `,
      text: [
        'Verified',
        '',
        `Verify your account: ${verifyUrl}`,
        '',
        'Regards,',
        'Docita Care Team',
      ].join('\n'),
    });
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    return this.emailProvider.send(options);
  }

  async sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    return this.emailProvider.sendTemplate(options);
  }

  async verifyProvider(): Promise<boolean> {
    try {
      return await this.emailProvider.verify();
    } catch (error) {
      this.logger.error(
        'Email provider verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }
}
