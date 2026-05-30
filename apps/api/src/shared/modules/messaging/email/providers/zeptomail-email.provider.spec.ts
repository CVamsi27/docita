import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ZeptoMailEmailProvider } from './zeptomail-email.provider';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('ZeptoMailEmailProvider', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function createProvider(token = 'test-token') {
    const configService = {
      getZeptoMailSendMailToken: () => token,
      getZeptoMailApiUrl: () => 'https://api.zeptomail.in/v1.1/email',
      getEmailFrom: () => 'Docita <notifications@docita.work>',
    } as AppConfigService;

    return new ZeptoMailEmailProvider(configService);
  }

  it('sends reply_to as an array per ZeptoMail API contract', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          data: [{ message_id: 'msg-1' }],
          request_id: 'req-1',
        }),
    } as Response);

    const provider = createProvider();
    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: '<p>Reset</p>',
      replyTo: 'support@docita.work',
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body)) as {
      reply_to?: Array<{ address: string }>;
      from: { address: string; name?: string };
    };

    expect(payload.reply_to).toEqual([{ address: 'support@docita.work' }]);
    expect(payload.from).toEqual({
      name: 'Docita',
      address: 'notifications@docita.work',
    });
  });

  it('supports text-only transactional emails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ data: [{ message_id: 'msg-text' }] }),
    } as Response);

    const provider = createProvider();
    const result = await provider.send({
      to: ['admin@example.com', 'billing@example.com'],
      subject: 'Usage warning',
      text: 'Your clinic reached 80% usage.',
    });

    expect(result.success).toBe(true);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body)) as {
      htmlbody?: string;
      textbody?: string;
      to: Array<{ email_address: { address: string } }>;
    };

    expect(payload.textbody).toContain('80% usage');
    expect(payload.htmlbody).toBeUndefined();
    expect(payload.to).toHaveLength(2);
  });

  it('prefixes bare send mail tokens with Zoho-enczapikey', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ data: [{ message_id: 'msg-2' }] }),
    } as Response);

    const provider = createProvider('plain-token');
    await provider.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;

    expect(headers.Authorization).toBe('Zoho-enczapikey plain-token');
  });

  it('returns provider error details when ZeptoMail rejects the request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            message: 'Invalid reply_to',
            details: [
              {
                code: 'EM_101',
                target: 'reply_to',
                message: 'Invalid data type',
              },
            ],
          },
        }),
    } as Response);

    const provider = createProvider();
    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      replyTo: 'support@docita.work',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid reply_to');
    expect(result.error).toContain('reply_to');
  });

  it('rejects sends without html or text before calling ZeptoMail', async () => {
    const provider = createProvider();
    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Empty body',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('html or text body');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects sends without recipients before calling ZeptoMail', async () => {
    const provider = createProvider();
    const result = await provider.send({
      to: ['', '   '],
      subject: 'No recipients',
      html: '<p>Hi</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('recipient');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns failure when token is missing', async () => {
    const provider = createProvider('');
    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ZEPTOMAIL_SENDMAIL_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
