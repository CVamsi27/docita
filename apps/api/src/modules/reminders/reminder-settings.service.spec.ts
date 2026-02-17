import { Test, TestingModule } from '@nestjs/testing';
import { ReminderSettingsService } from './reminder-settings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReminderSettingsService', () => {
  let service: ReminderSettingsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      reminderSettings: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSettingsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ReminderSettingsService>(ReminderSettingsService);
    prisma = module.get(PrismaService);
  });

  describe('getSettings', () => {
    it('should return existing settings if they exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        enabled: true,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: false,
        hoursBeforeAppt: 24,
        minutesBefore30: true,
        emailSubject: 'Appointment Reminder',
        emailTemplate: 'Dear {patientName}...',
        smsTemplate: 'Reminder: You have an appointment...',
        whatsappTemplate: null,
      };

      prisma.reminderSettings.findFirst.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(result).toEqual(mockSettings);
      expect(prisma.reminderSettings.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should create default settings if none exist', async () => {
      const defaultSettings = {
        id: 'settings-new',
        enabled: true,
        smsEnabled: false,
        emailEnabled: true,
        whatsappEnabled: true,
        hoursBeforeAppt: 24,
        minutesBefore30: true,
        emailSubject: 'Appointment Reminder - {clinicName}',
        emailTemplate: expect.stringContaining('Dear {patientName}'),
        smsTemplate: expect.stringContaining('Reminder:'),
        whatsappTemplate: null,
      };

      prisma.reminderSettings.findUnique.mockResolvedValueOnce(null);
      prisma.reminderSettings.create.mockResolvedValue(defaultSettings);

      const result = await service.getSettings('clinic-123');

      expect(result).toEqual(defaultSettings);
    });

    it('should use correct default values for new settings', async () => {
      const defaultSettings = {
        id: 'settings-new',
        enabled: true,
        smsEnabled: false,
        emailEnabled: true,
        whatsappEnabled: true,
        hoursBeforeAppt: 24,
        minutesBefore30: true,
        emailSubject: 'Appointment Reminder - {clinicName}',
        emailTemplate: expect.stringContaining('Dear {patientName}'),
        smsTemplate: expect.stringContaining('Reminder:'),
        whatsappTemplate: null,
      };

      prisma.reminderSettings.findUnique.mockResolvedValueOnce(null);
      prisma.reminderSettings.create.mockResolvedValue(defaultSettings);

      const result = await service.getSettings('clinic-456');
      expect(prisma.reminderSettings.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.reminderSettings.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enabled: true,
          emailEnabled: true,
          hoursBeforeAppt: 24,
        }),
      });
    });

    it('should use correct default values for new settings', async () => {
      prisma.reminderSettings.findUnique.mockResolvedValueOnce(null);
      prisma.reminderSettings.create.mockResolvedValue({
        id: 'settings-new',
        clinicId: 'clinic-999',
        enabled: true,
        smsEnabled: false,
        emailEnabled: true,
        whatsappEnabled: true,
        hoursBeforeAppt: 24,
        minutesBefore30: true,
        emailSubject: 'Appointment Reminder - {clinicName}',
        emailTemplate: 'Dear {patientName}...',
        smsTemplate: 'Reminder: You have an appointment...',
        whatsappTemplate: null,
      });

      await service.getSettings('clinic-999');

      expect(prisma.reminderSettings.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicId: 'clinic-999',
          emailSubject: 'Appointment Reminder - {clinicName}',
          smsEnabled: false,
          emailEnabled: true,
          whatsappEnabled: true,
        }),
      });
    });

    it('should cache/reuse existing settings on second call', async () => {
      const mockSettings = { id: 'settings-1', enabled: true };

      prisma.reminderSettings.findFirst.mockResolvedValue(mockSettings);

      const result1 = await service.getSettings();
      const result2 = await service.getSettings();

      expect(result1).toEqual(mockSettings);
      expect(result2).toEqual(mockSettings);
      expect(prisma.reminderSettings.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateSettings', () => {
    it('should update existing settings with provided data', async () => {
      const existingSettings = { id: 'settings-1', enabled: true };
      const updateData = { emailEnabled: false, hoursBeforeAppt: 12 };
      const updatedSettings = { ...existingSettings, ...updateData };

      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(updateData);

      expect(result).toEqual(updatedSettings);
      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: updateData,
      });
    });

    it('should enable SMS reminders when requested', async () => {
      const existingSettings = { id: 'settings-1' };
      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        smsEnabled: true,
      });

      await service.updateSettings({ smsEnabled: true });

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: { smsEnabled: true },
      });
    });

    it('should disable email reminders when requested', async () => {
      const existingSettings = { id: 'settings-1' };
      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        emailEnabled: false,
      });

      await service.updateSettings({ emailEnabled: false });

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: { emailEnabled: false },
      });
    });

    it('should update custom templates', async () => {
      const existingSettings = { id: 'settings-1' };
      const customData = {
        emailTemplate: 'Custom email template',
        smsTemplate: 'Custom SMS template',
      };

      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        ...customData,
      });

      await service.updateSettings(customData);

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: customData,
      });
    });

    it('should update reminder timing preferences', async () => {
      const existingSettings = { id: 'settings-1' };
      const updateData = {
        hoursBeforeAppt: 48,
        minutesBefore30: false,
      };

      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        ...updateData,
      });

      await service.updateSettings(updateData);

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: updateData,
      });
    });

    it('should throw error if update fails', async () => {
      prisma.reminderSettings.findFirst.mockResolvedValue({ id: 'settings-1' });
      prisma.reminderSettings.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.updateSettings({ enabled: false })).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle partial updates', async () => {
      const existingSettings = { id: 'settings-1', enabled: true };
      const partialUpdate = { emailEnabled: false };

      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        ...partialUpdate,
      });

      const result = await service.updateSettings(partialUpdate);

      expect(result.emailEnabled).toBe(false);
      expect(result.enabled).toBe(true); // unchanged
    });
  });

  describe('Settings Data Validation', () => {
    it('should handle enabled flag correctly', async () => {
      const existingSettings = { id: 'settings-1', enabled: false };
      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        enabled: true,
      });

      await service.updateSettings({ enabled: true });

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: { enabled: true },
      });
    });

    it('should handle multiple channel selections', async () => {
      const existingSettings = { id: 'settings-1' };
      const channelUpdate = {
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
      };

      prisma.reminderSettings.findFirst.mockResolvedValue(existingSettings);
      prisma.reminderSettings.update.mockResolvedValue({
        ...existingSettings,
        ...channelUpdate,
      });

      await service.updateSettings(channelUpdate);

      expect(prisma.reminderSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: channelUpdate,
      });
    });
  });
});
