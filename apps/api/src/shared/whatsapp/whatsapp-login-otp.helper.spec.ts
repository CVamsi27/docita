import { describe, expect, it, jest } from '@jest/globals';
import type { Logger } from '@nestjs/common';
import type { IWhatsAppClient } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { sendLoginOtp } from './whatsapp-login-otp.helper';

function makeLogger(): jest.Mocked<Logger> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
}

interface WhatsAppRequest {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: unknown;
  // Other fields are allowed at runtime (text, sender, etc.) but the
  // mock only inspects the call to assert on what we care about.
  [key: string]: unknown;
}

describe('sendLoginOtp', () => {
  function mockWhatsapp(
    impl: (req: WhatsAppRequest) => Promise<{ externalId: string }>,
  ) {
    const sendMessage = jest.fn(impl);
    return {
      sendMessage,
      client: { sendMessage } as unknown as IWhatsAppClient,
    };
  }

  it('sends a single body-text component carrying the OTP', async () => {
    const { client, sendMessage } = mockWhatsapp(async () => ({
      externalId: 'wamid.1',
    }));
    const logger = makeLogger();

    await sendLoginOtp(client, logger, 'patient', {
      to: '+919999999999',
      templateName: 'patient_login_otp',
      otp: '123456',
    });

    expect(sendMessage).toHaveBeenCalledWith({
      to: '+919999999999',
      templateName: 'patient_login_otp',
      languageCode: 'en',
      components: [
        { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
      ],
    });
  });

  it('defaults the language code to "en" when not supplied', async () => {
    const { client, sendMessage } = mockWhatsapp(async () => ({
      externalId: 'wamid.1',
    }));
    const logger = makeLogger();

    await sendLoginOtp(client, logger, 'partner', {
      to: '+919999999999',
      templateName: 'partner_login_otp',
      otp: '654321',
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'en' }),
    );
  });

  it('honors a caller-supplied language code', async () => {
    const { client, sendMessage } = mockWhatsapp(async () => ({
      externalId: 'wamid.1',
    }));
    const logger = makeLogger();

    await sendLoginOtp(client, logger, 'partner', {
      to: '+919999999999',
      templateName: 'partner_login_otp',
      otp: '654321',
      languageCode: 'hi',
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'hi' }),
    );
  });

  it('swallows sendMessage errors and logs them at warn level', async () => {
    const { client, sendMessage } = mockWhatsapp(async () => {
      throw new Error('meta api down');
    });
    const logger = makeLogger();

    // Must not throw — the whole point of the helper.
    await expect(
      sendLoginOtp(client, logger, 'partner', {
        to: '+919999999999',
        templateName: 'partner_login_otp',
        otp: '123456',
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const warnArg = (logger.warn.mock.calls[0]?.[0] as string) ?? '';
    expect(warnArg).toContain('partner');
    expect(warnArg).toContain('+919999999999');
    expect(warnArg).toContain('meta api down');
    void sendMessage; // referenced for shape
  });

  it('handles non-Error throws gracefully', async () => {
    const { client } = mockWhatsapp(async () => {
      throw 'string error' as unknown;
    });
    const logger = makeLogger();

    await sendLoginOtp(client, logger, 'patient', {
      to: '+919999999999',
      templateName: 'patient_login_otp',
      otp: '123456',
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect((logger.warn.mock.calls[0]?.[0] as string) ?? '').toContain(
      'unknown error',
    );
  });
});
