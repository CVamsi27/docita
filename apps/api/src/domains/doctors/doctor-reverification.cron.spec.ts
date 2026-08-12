import { DoctorReverificationCron } from './doctor-reverification.cron';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

describe('DoctorReverificationCron', () => {
  const mockDoctorVerificationService = {
    runDoctorReverificationSweep: jest.fn(),
  } as any;

  let cron: DoctorReverificationCron;

  beforeEach(() => {
    jest.resetAllMocks();
    cron = new DoctorReverificationCron(mockDoctorVerificationService);
  });

  describe('CRON_SCHEDULES wiring', () => {
    it('uses the DOCTOR_REVERIFICATION schedule', () => {
      expect(CRON_SCHEDULES.DOCTOR_REVERIFICATION).toBeDefined();
      expect(typeof CRON_SCHEDULES.DOCTOR_REVERIFICATION).toBe('string');
    });
  });

  describe('run', () => {
    it('delegates to doctorVerificationService.runDoctorReverificationSweep', async () => {
      await cron.run();
      expect(
        mockDoctorVerificationService.runDoctorReverificationSweep,
      ).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the service', async () => {
      mockDoctorVerificationService.runDoctorReverificationSweep.mockRejectedValue(
        new Error('DB connection lost'),
      );
      await expect(cron.run()).rejects.toThrow('DB connection lost');
    });

    it('calls the service with no arguments', async () => {
      await cron.run();
      expect(
        mockDoctorVerificationService.runDoctorReverificationSweep,
      ).toHaveBeenCalledWith();
    });
  });
});
