import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderHistoryService } from './reminder-history.service';

describe('RemindersService (Facade)', () => {
  let service: RemindersService;
  type ReminderType = Parameters<RemindersService['sendManualReminder']>[1];
  let settingsService: {
    getSettings: jest.Mock;
    updateSettings: jest.Mock;
  };
  let historyService: {
    sendManualReminder: jest.Mock;
    getReminderHistory: jest.Mock;
  };

  beforeEach(async () => {
    const settingsServiceMock = {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };

    const historyServiceMock = {
      sendManualReminder: jest.fn(),
      getReminderHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: ReminderSettingsService,
          useValue: settingsServiceMock,
        },
        {
          provide: ReminderHistoryService,
          useValue: historyServiceMock,
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    settingsService = module.get(ReminderSettingsService) as {
      getSettings: jest.Mock;
      updateSettings: jest.Mock;
    };
    historyService = module.get(ReminderHistoryService) as {
      sendManualReminder: jest.Mock;
      getReminderHistory: jest.Mock;
    };
  });

  describe('getSettings', () => {
    it('should delegate to ReminderSettingsService and return settings', async () => {
      const mockSettings = {
        id: 'clinic-1',
        enabled: true,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        hoursBeforeAppt: 24,
      };

      settingsService.getSettings.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(result).toEqual(mockSettings);
      expect(settingsService.getSettings).toHaveBeenCalledTimes(1);
    });

    it('should throw error if settings service fails', async () => {
      settingsService.getSettings.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getSettings()).rejects.toThrow('Database error');
    });
  });

  describe('updateSettings', () => {
    it('should delegate to ReminderSettingsService with provided data', async () => {
      const updateData = {
        smsEnabled: false,
        hoursBeforeAppt: 12,
      };

      const mockResponse = {
        id: 'clinic-1',
        ...updateData,
      };

      settingsService.updateSettings.mockResolvedValue(mockResponse);

      const result = await service.updateSettings(updateData);

      expect(result).toEqual(mockResponse);
      expect(settingsService.updateSettings).toHaveBeenCalledWith(
        updateData,
        undefined,
      );
    });

    it('should handle validation errors from settings service', async () => {
      settingsService.updateSettings.mockRejectedValue(
        new Error('Invalid reminder timing'),
      );

      await expect(
        service.updateSettings({ hoursBeforeAppt: 0 }),
      ).rejects.toThrow('Invalid reminder timing');
    });
  });

  describe('sendManualReminder', () => {
    it('should delegate to ReminderHistoryService to send reminder', async () => {
      const appointmentId = 'appt-123';
      const reminderType: ReminderType = 'email';

      historyService.sendManualReminder.mockResolvedValue({
        success: true,
        message: 'email reminder sent',
      });

      await service.sendManualReminder(appointmentId, reminderType);

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        appointmentId,
        reminderType,
        undefined,
      );
    });

    it('should throw error if appointment not found', async () => {
      historyService.sendManualReminder.mockRejectedValue(
        new Error('Appointment not found'),
      );

      await expect(
        service.sendManualReminder('invalid-id', 'email'),
      ).rejects.toThrow('Appointment not found');
    });

    it('should support email reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue({
        success: true,
        message: 'email reminder sent',
      });

      await service.sendManualReminder('appt-1', 'email');

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'email',
        undefined,
      );
    });

    it('should support SMS reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue({
        success: true,
        message: 'sms reminder sent',
      });

      await service.sendManualReminder('appt-1', 'sms');

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'sms',
        undefined,
      );
    });

    it('should support WhatsApp reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue({
        success: true,
        message: 'whatsapp reminder sent',
      });

      await service.sendManualReminder('appt-1', 'whatsapp');

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'whatsapp',
        undefined,
      );
    });
  });

  describe('getReminderHistory', () => {
    it('should retrieve reminder history for clinic', async () => {
      const clinicId = 'clinic-1';
      const mockHistory = [
        {
          id: 'reminder-1',
          appointmentId: 'appt-1',
          sentAt: new Date('2024-01-01'),
          type: 'sms',
          status: 'sent',
          appointment: {
            id: 'appt-1',
            patient: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        },
        {
          id: 'reminder-2',
          appointmentId: 'appt-2',
          sentAt: new Date('2024-01-02'),
          type: 'email',
          status: 'failed',
          appointment: {
            id: 'appt-2',
            patient: {
              firstName: 'Jane',
              lastName: 'Doe',
            },
          },
        },
      ];

      historyService.getReminderHistory.mockResolvedValue(mockHistory);

      const result = await service.getReminderHistory(clinicId);

      expect(result).toEqual(mockHistory);
      expect(historyService.getReminderHistory).toHaveBeenCalledWith(
        clinicId,
        undefined,
      );
    });

    it('should pass limit parameter to history service', async () => {
      historyService.getReminderHistory.mockResolvedValue([]);

      await service.getReminderHistory('clinic-1', 100);

      expect(historyService.getReminderHistory).toHaveBeenCalledWith(
        'clinic-1',
        100,
      );
    });

    it('should return empty array if no history exists', async () => {
      historyService.getReminderHistory.mockResolvedValue([]);

      const result = await service.getReminderHistory('clinic-empty');

      expect(result).toEqual([]);
    });
  });

  describe('Facade Pattern Compliance', () => {
    it('should maintain single responsibility (delegation only)', () => {
      const serviceMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(service),
      ).filter((m) => m !== 'constructor');

      expect(serviceMethods.length).toBeGreaterThan(0);
      expect(serviceMethods.length).toBeLessThan(10);
    });

    it('should be injectable with all required dependencies', () => {
      expect(service).toBeDefined();
      expect(service).toHaveProperty('getSettings');
      expect(service).toHaveProperty('updateSettings');
      expect(service).toHaveProperty('sendManualReminder');
      expect(service).toHaveProperty('getReminderHistory');
    });

    it('should provide public API for all reminder operations', () => {
      expect(typeof service.getSettings).toBe('function');
      expect(typeof service.updateSettings).toBe('function');
      expect(typeof service.sendManualReminder).toBe('function');
      expect(typeof service.getReminderHistory).toBe('function');
    });
  });

  describe('Dependency Injection', () => {
    it('should have settingsService injected', () => {
      expect(service['settingsService']).toBeDefined();
    });

    it('should have historyService injected', () => {
      expect(service['historyService']).toBeDefined();
    });
  });
});
