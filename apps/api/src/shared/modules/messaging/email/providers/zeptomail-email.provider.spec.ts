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
      json: async () => ({
        data: [{ message_id: 'msg-1' }],
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
    };

    expect(payload.reply_to).toEqual([{ address: 'support@docita.work' }]);
  });

  it('prefixes bare send mail tokens with Zoho-enczapikey', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ message_id: 'msg-2' }] }),
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
      text: async () => '{"error":{"message":"Invalid reply_to"}}',
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
  });
});
