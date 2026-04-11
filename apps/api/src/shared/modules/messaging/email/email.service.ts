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
    name: string,
    verificationToken: string,
  ): Promise<EmailSendResult> {
    const verifyUrl = `${this.configService.getAppUrl()}/verify-email?token=${verificationToken}`;
    const safeName = escapeHtml(name);

    return this.emailProvider.send({
      to: email,
      subject: 'Verify Your Email - Docita',
      replyTo: this.supportEmail,
      html: `
        <div style="margin:0; background:#f4f7fb; padding:32px 16px; color:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #dbe4f0; border-radius:20px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,0.08);">
            <div style="padding:24px 28px; background:linear-gradient(135deg,#0f766e 0%,#0f4c81 100%); color:#ffffff;">
              <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.85;">Docita account security</p>
              <h1 style="margin:0; font-size:28px; line-height:1.2; font-weight:700;">Verify your email address</h1>
              <p style="margin:12px 0 0; font-size:15px; line-height:1.6; color:rgba(255,255,255,0.88);">
                Confirm your owner account before continuing with clinic setup.
              </p>
            </div>

            <div style="padding:32px 28px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.7;">Hi ${safeName},</p>
              <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#334155;">
                Thanks for starting your Docita account. Please confirm that this email belongs to you before you continue to choose your path and set up your clinic workspace.
              </p>

              <div style="margin:24px 0; border:1px solid #dbe4f0; border-radius:16px; background:#f8fafc; padding:20px;">
                <p style="margin:0 0 14px; font-size:14px; line-height:1.6; color:#475569;">
                  This verification link stays active for 24 hours.
                </p>
                <a href="${verifyUrl}"
                   style="display:inline-block; background:#0f766e; color:#ffffff; padding:14px 24px; border-radius:12px; text-decoration:none; font-weight:600;">
                  Verify email
                </a>
                <p style="margin:14px 0 0; font-size:13px; line-height:1.6; color:#64748b;">
                  If the button does not open, copy and paste this link into your browser:<br />
                  <a href="${verifyUrl}" style="color:#0f4c81; word-break:break-all;">${verifyUrl}</a>
                </p>
              </div>

              <p style="margin:0 0 16px; font-size:14px; line-height:1.7; color:#475569;">
                If you did not create a Docita account, you can safely ignore this email.
              </p>

              <div style="margin-top:28px; padding-top:20px; border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 8px; font-size:15px; line-height:1.6;">Warm regards,</p>
                <p style="margin:0; font-size:15px; line-height:1.6; font-weight:600;">Docita Care Team</p>
                <p style="margin:4px 0 0; font-size:14px; line-height:1.6; color:#64748b;">
                  Need help? Reply to this email or contact
                  <a href="mailto:${this.supportEmail}" style="color:#0f4c81; text-decoration:none;"> ${this.supportEmail}</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      `,
      text: [
        'Verify your email address',
        '',
        `Hi ${name},`,
        '',
        'Thanks for starting your Docita account. Please confirm your email before continuing with clinic setup.',
        '',
        `Verify your account: ${verifyUrl}`,
        '',
        'This verification link stays active for 24 hours.',
        `Need help? Reply to this email or contact ${this.supportEmail}.`,
        '',
        'Warm regards,',
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
