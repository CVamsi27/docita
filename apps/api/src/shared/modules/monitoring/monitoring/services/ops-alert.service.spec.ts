import { OpsAlertService } from './ops-alert.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('OpsAlertService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('no-ops when webhook URL is unset', async () => {
    const appConfig = Object.create(
      AppConfigService.prototype,
    ) as AppConfigService;
    jest.spyOn(appConfig, 'getOpsAlertWebhookUrl').mockReturnValue('');

    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const service = new OpsAlertService(appConfig);
    await service.notify({ title: 'Test', text: 'Body' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts Slack-compatible payload when webhook is configured', async () => {
    const appConfig = Object.create(
      AppConfigService.prototype,
    ) as AppConfigService;
    jest
      .spyOn(appConfig, 'getOpsAlertWebhookUrl')
      .mockReturnValue('https://hooks.example.test/ops');

    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    const service = new OpsAlertService(appConfig);
    await service.notify({
      title: 'Probe failed',
      text: 'api-health-live timed out',
      severity: 'page',
      tags: { probe: 'api-health-live' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.example.test/ops',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Probe failed'),
      }),
    );
  });
});
