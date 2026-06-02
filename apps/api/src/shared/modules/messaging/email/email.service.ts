import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailOptions,
  TemplatedEmailOptions,
  EmailSendResult,
  EMAIL_PROVIDER,
} from './providers/email-provider.interface';
import { DATE_FORMATS, escapeHtml, formatDateTime } from '@workspace/utils';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { formatPasswordResetTtlLabel } from '@/shared/modules/config/app-constants';
import { SUPPORT_EMAIL } from '@/shared/common/constants/support-contact.constants';
import {
  EmailSuppressionService,
  maskEmail,
} from './email-suppression.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly supportEmail = SUPPORT_EMAIL;

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    private configService: AppConfigService,
    private readonly suppression: EmailSuppressionService,
  ) {}

  /** First suppressed recipient (if any) so the caller can skip the send. */
  private async firstSuppressedRecipient(
    to: string | string[],
  ): Promise<string | null> {
    const recipients = Array.isArray(to) ? to : [to];
    for (const recipient of recipients) {
      if (await this.suppression.isSuppressed(recipient)) return recipient;
    }
    return null;
  }

  /**
   * Shared transactional-email chrome: a single centered card on a soft
   * background, brand-teal CTA, optional fallback link and note, and a
   * consistent sign-off. Inline styles only — email clients ignore CSS
   * variables and most external/embedded CSS. Callers must pre-escape any
   * user-supplied values interpolated into `title`, `intro`, or `bodyHtml`.
   */
  private renderEmailShell(opts: {
    title: string;
    intro?: string;
    bodyHtml?: string;
    cta?: { label: string; url: string };
    fallbackUrl?: string;
    note?: string;
  }): string {
    const { title, intro, bodyHtml, cta, fallbackUrl, note } = opts;

    return `
      <div style="margin:0; padding:32px 16px; background:#f8fafc; color:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:420px; margin:0 auto; background:#ffffff; border:1px solid #dbe4f0; border-radius:16px; padding:32px 24px; text-align:center;">
          <p style="margin:0 0 10px; font-size:28px; line-height:1.2; font-weight:700;">${title}</p>
          ${
            intro
              ? `<p style="margin:0 0 18px; font-size:14px; line-height:1.6; color:#475569;">${intro}</p>`
              : ''
          }
          ${bodyHtml ?? ''}
          ${
            cta
              ? `<a href="${cta.url}" style="display:inline-block; background:#0f766e; color:#ffffff; padding:14px 24px; border-radius:12px; text-decoration:none; font-weight:600;">${cta.label}</a>`
              : ''
          }
          ${
            fallbackUrl
              ? `<p style="margin:18px 0 0; font-size:12px; line-height:1.6; color:#64748b;">If the button does not work, copy and paste this link into your browser:<br /><a href="${fallbackUrl}" style="color:#0f766e; text-decoration:underline; word-break:break-all;">${fallbackUrl}</a></p>`
              : ''
          }
          ${
            note
              ? `<p style="margin:18px 0 0; font-size:12px; line-height:1.6; color:#64748b;">${note}</p>`
              : ''
          }
          <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#475569;">
            Regards,<br />
            Docita Care Team
          </p>
        </div>
      </div>
    `;
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    clinicName: string,
  ): Promise<EmailSendResult> {
    const safeName = escapeHtml(name);
    const safeClinicName = escapeHtml(clinicName);
    const getStartedUrl = this.configService.getEmailLinkBaseUrl();

    return this.send({
      to: email,
      subject: `Welcome to Docita - ${safeClinicName}`,
      html: this.renderEmailShell({
        title: `Welcome, ${safeName}!`,
        intro: `Your clinic <strong>${safeClinicName}</strong> is set up on Docita. You can start managing your practice right away.`,
        cta: { label: 'Get Started', url: getStartedUrl },
      }),
      text: [
        `Welcome, ${name}!`,
        '',
        `Your clinic ${clinicName} is set up on Docita. You can start managing your practice right away.`,
        '',
        `Get started: ${getStartedUrl}`,
        '',
        'Regards,',
        'Docita Care Team',
      ].join('\n'),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<EmailSendResult> {
    const resetUrl = `${this.configService.getEmailLinkBaseUrl()}/reset-password?token=${resetToken}`;
    const expiryLabel = formatPasswordResetTtlLabel();
    const expiryNotice = `This link expires in ${expiryLabel}. If you did not request this, you can ignore this email`;

    return this.send({
      to: email,
      subject: 'Reset your password - Docita',
      replyTo: this.supportEmail,
      html: this.renderEmailShell({
        title: 'Reset your password',
        intro: 'Click the button below to set a new password',
        cta: { label: 'Reset password', url: resetUrl },
        fallbackUrl: resetUrl,
        note: expiryNotice,
      }),
      text: [
        'Reset your password',
        '',
        `Open this link to reset: ${resetUrl}`,
        '',
        expiryNotice,
        '',
        'Regards,',
        'Docita Care Team',
      ].join('\n'),
    });
  }

  async sendAppointmentReminder(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    clinicName: string,
  ): Promise<EmailSendResult> {
    const formattedDate = formatDateTime(
      appointmentDate,
      DATE_FORMATS.DATETIME_WEEKDAY_LONG,
    );

    const safePatientName = escapeHtml(patientName);
    const safeDoctorName = escapeHtml(doctorName);
    const safeClinicName = escapeHtml(clinicName);

    const detailsHtml = `
      <div style="margin:18px 0 0; text-align:left; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
        <p style="margin:0 0 8px; font-size:14px; line-height:1.5; color:#0f172a;"><strong>Doctor:</strong> Dr. ${safeDoctorName}</p>
        <p style="margin:0 0 8px; font-size:14px; line-height:1.5; color:#0f172a;"><strong>Date & Time:</strong> ${formattedDate}</p>
        <p style="margin:0; font-size:14px; line-height:1.5; color:#0f172a;"><strong>Clinic:</strong> ${safeClinicName}</p>
      </div>
    `;

    return this.send({
      to: email,
      subject: `Appointment Reminder - ${safeClinicName}`,
      html: this.renderEmailShell({
        title: 'Appointment Reminder',
        intro: `Dear ${safePatientName}, this is a reminder for your upcoming appointment.`,
        bodyHtml: detailsHtml,
        note: 'Please arrive 10 minutes before your scheduled time.',
      }),
      text: [
        'Appointment Reminder',
        '',
        `Dear ${patientName}, this is a reminder for your upcoming appointment.`,
        '',
        `Doctor: Dr. ${doctorName}`,
        `Date & Time: ${formattedDate}`,
        `Clinic: ${clinicName}`,
        '',
        'Please arrive 10 minutes before your scheduled time.',
        '',
        'Regards,',
        'Docita Care Team',
      ].join('\n'),
    });
  }

  async sendVerificationEmail(
    email: string,
    _name: string,
    verificationToken: string,
  ): Promise<EmailSendResult> {
    const verifyUrl = `${this.configService.getEmailLinkBaseUrl()}/verify-email?token=${verificationToken}`;

    return this.send({
      to: email,
      subject: 'Verify Your Email - Docita',
      replyTo: this.supportEmail,
      html: this.renderEmailShell({
        title: 'Verify your email',
        intro: 'Click the button below to verify your email address.',
        cta: { label: 'Verify email', url: verifyUrl },
        fallbackUrl: verifyUrl,
      }),
      text: [
        'Verify your email',
        '',
        `Click to verify: ${verifyUrl}`,
        '',
        'Regards,',
        'Docita Care Team',
      ].join('\n'),
    });
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    const suppressed = await this.firstSuppressedRecipient(options.to);
    if (suppressed) {
      this.logger.warn(
        `Skipping email to suppressed address ${maskEmail(suppressed)}`,
      );
      return { success: false, error: 'recipient_suppressed' };
    }
    return this.emailProvider.send(options);
  }

  async sendTemplate(options: TemplatedEmailOptions): Promise<EmailSendResult> {
    const suppressed = await this.firstSuppressedRecipient(options.to);
    if (suppressed) {
      this.logger.warn(
        `Skipping templated email to suppressed address ${maskEmail(suppressed)}`,
      );
      return { success: false, error: 'recipient_suppressed' };
    }
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
