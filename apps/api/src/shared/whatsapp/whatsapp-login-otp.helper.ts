import type { Logger } from '@nestjs/common';
import type { IWhatsAppClient } from '@/domains/whatsapp/application/ports/whatsapp-client.port';

export interface SendLoginOtpParams {
  to: string;
  templateName: string;
  otp: string;
  languageCode?: string;
}

const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Sends a single-OTP WhatsApp login template and swallows transport
 * errors with a warn-level log so login flows never break on a
 * WhatsApp hiccup. The shared shape is used by patient-portal and
 * referral-partner auth; both call sites used to inline the same
 * 10-line try/catch, which jscpd flagged as duplication.
 */
export async function sendLoginOtp(
  whatsapp: IWhatsAppClient,
  logger: Logger,
  audience: 'patient' | 'partner',
  params: SendLoginOtpParams,
): Promise<void> {
  try {
    await whatsapp.sendMessage({
      to: params.to,
      templateName: params.templateName,
      languageCode: params.languageCode ?? DEFAULT_LANGUAGE_CODE,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: params.otp }],
        },
      ],
    });
  } catch (error) {
    logger.warn(
      `Failed to send ${audience} login OTP to ${params.to}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }
}
