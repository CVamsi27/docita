import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderHistoryService } from './reminder-history.service';

describe('RemindersService (Facade)', () => {
  let service: RemindersService;
  let settingsService: jest.Mocked<ReminderSettingsService>;
  let historyService: jest.Mocked<ReminderHistoryService>;

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
    settingsService = module.get(ReminderSettingsService);
    historyService = module.get(ReminderHistoryService);
  });

  describe('getSettings', () => {
    it('should delegate to ReminderSettingsService and return settings', async () => {
      const mockSettings = {
        id: 'clinic-1',
        enableSMS: true,
        enableEmail: true,
        enableWhatsApp: true,
        reminderTiming: [1440, 60, 0], // 24h, 1h, 0h before appointment
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
        enableSMS: false,
        reminderTiming: [1440, 120, 30],
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
        service.updateSettings({ reminderTiming: [-1, 0] }),
      ).rejects.toThrow('Invalid reminder timing');
    });
  });

  describe('sendManualReminder', () => {
    it('should delegate to ReminderHistoryService to send reminder', async () => {
      const appointmentId = 'appt-123';
      const reminderType = 'email';

      historyService.sendManualReminder.mockResolvedValue(undefined);

      await service.sendManualReminder(appointmentId, reminderType as any);

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        appointmentId,
        reminderType,
      );
    });

    it('should throw error if appointment not found', async () => {
      historyService.sendManualReminder.mockRejectedValue(
        new Error('Appointment not found'),
      );

      await expect(
        service.sendManualReminder('invalid-id', 'email' as any),
      ).rejects.toThrow('Appointment not found');
    });

    it('should support email reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue(undefined);

      await service.sendManualReminder('appt-1', 'email' as any);

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'email',
      );
    });

    it('should support SMS reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue(undefined);

      await service.sendManualReminder('appt-1', 'sms' as any);

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'sms',
      );
    });

    it('should support WhatsApp reminder type', async () => {
      historyService.sendManualReminder.mockResolvedValue(undefined);

      await service.sendManualReminder('appt-1', 'whatsapp' as any);

      expect(historyService.sendManualReminder).toHaveBeenCalledWith(
        'appt-1',
        'whatsapp',
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
        },
        {
          id: 'reminder-2',
          appointmentId: 'appt-2',
          sentAt: new Date('2024-01-02'),
          type: 'email',
          status: 'failed',
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
      expect(serviceMethods.length).toBeLessThan(10); // Facade should have few methods
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
