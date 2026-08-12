import { MedicalCodeSyncCron } from './medical-code-sync.cron';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

describe('MedicalCodeSyncCron', () => {
  const mockMedicalCodeSyncService = {
    syncCommonCodes: jest.fn(),
  } as any;

  let cron: MedicalCodeSyncCron;

  beforeEach(() => {
    jest.resetAllMocks();
    cron = new MedicalCodeSyncCron(mockMedicalCodeSyncService);
  });

  describe('CRON_SCHEDULES wiring', () => {
    it('uses the MEDICAL_CODE_SYNC schedule', () => {
      expect(CRON_SCHEDULES.MEDICAL_CODE_SYNC).toBeDefined();
      expect(typeof CRON_SCHEDULES.MEDICAL_CODE_SYNC).toBe('string');
    });
  });

  describe('run', () => {
    it('delegates to medicalCodeSyncService.syncCommonCodes', async () => {
      await cron.run();
      expect(mockMedicalCodeSyncService.syncCommonCodes).toHaveBeenCalledTimes(
        1,
      );
    });

    it('propagates errors from the service', async () => {
      mockMedicalCodeSyncService.syncCommonCodes.mockRejectedValue(
        new Error('External API timeout'),
      );
      await expect(cron.run()).rejects.toThrow('External API timeout');
    });

    it('calls the service with no arguments', async () => {
      await cron.run();
      expect(mockMedicalCodeSyncService.syncCommonCodes).toHaveBeenCalledWith();
    });
  });
});
