import { Test, TestingModule } from '@nestjs/testing';
import { SettingsFactory } from './settings.factory';
import { ZodError } from 'zod';

describe('SettingsFactory', () => {
  let factory: SettingsFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsFactory],
    }).compile();

    factory = module.get<SettingsFactory>(SettingsFactory);
  });

  describe('createDefault', () => {
    it('should create default clinic settings', () => {
      const defaults = factory.createDefault();

      expect(defaults).toBeDefined();
      expect(defaults?.workingDays).toContain('Monday');
      expect(defaults?.workingDays?.length).toBe(6);
      expect(defaults?.consultationDuration).toBe(30);
    });

    it('should have default reminder settings', () => {
      const defaults = factory.createDefault();

      expect(defaults.reminderBefore).toBe(30);
      expect(defaults.reminderUnit).toBe('minutes');
    });

    it('should have whatsapp settings enabled by default', () => {
      const defaults = factory.createDefault();

      expect(defaults.whatsappAppointmentReminders).toBe(true);
      expect(defaults.whatsappMedicineReminders).toBe(true);
      expect(defaults.whatsappFollowUpMessages).toBe(false);
      expect(defaults.whatsappBirthdayWishes).toBe(false);
    });

    it('should have notification settings with email enabled', () => {
      const defaults = factory.createDefault();

      expect(defaults.emailNotifications).toBe(true);
      expect(defaults.smsNotifications).toBe(false);
      expect(defaults.pushNotifications).toBe(true);
      expect(defaults.appointmentAlerts).toBe(true);
    });

    it('should have prescription defaults configured', () => {
      const defaults = factory.createDefault();

      expect(defaults.includeClinicHeader).toBe(true);
      expect(defaults.includeDoctorSignature).toBe(true);
      expect(defaults.includeQRCode).toBe(false);
    });

    it('should have theme and UI defaults', () => {
      const defaults = factory.createDefault();

      expect(defaults.theme).toBe('light');
      expect(defaults.primaryColor).toBe('#0066cc');
      expect(defaults.compactMode).toBe(false);
    });

    it('should have security defaults', () => {
      const defaults = factory.createDefault();

      expect(defaults.twoFactorAuth).toBe(false);
      expect(defaults.auditLogs).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate complete settings object', () => {
      const settings = factory.createDefault();
      const result = factory.validate(settings);

      expect(result).toEqual(settings);
    });

    it('should accept empty object since all fields are optional', () => {
      const result = factory.validate({});
      expect(result).toBeDefined();

      expect(result.consultationDuration).toBe(30);
    });

    it('should accept partial object', () => {
      const partial = {
        consultationDuration: 45,
        emailNotifications: true,
      };

      const result = factory.validate(partial);
      expect(result.consultationDuration).toBe(45);
      expect(result.emailNotifications).toBe(true);
    });

    it('should reject invalid data types', () => {
      const invalid = {
        consultationDuration: 'not-a-number',
      };

      expect(() => factory.validate(invalid)).toThrow(ZodError);
    });

    it('should validate working days array', () => {
      const settings = {
        workingDays: ['Monday', 'Tuesday', 'Wednesday'],
      };

      const result = factory.validate(settings);
      expect(result.workingDays?.length).toBe(3);
    });

    it('should validate reminder settings', () => {
      const settings = {
        reminderBefore: 60,
        reminderUnit: 'hours',
      };

      const result = factory.validate(settings);
      expect(result.reminderBefore).toBe(60);
      expect(result.reminderUnit).toBe('hours');
    });

    it('should validate boolean notification flags', () => {
      const settings = {
        emailNotifications: false,
        smsNotifications: true,
        pushNotifications: false,
      };

      const result = factory.validate(settings);
      expect(result.emailNotifications).toBe(false);
      expect(result.smsNotifications).toBe(true);
      expect(result.pushNotifications).toBe(false);
    });

    it('should validate theme and color values', () => {
      const settings = {
        theme: 'dark',
        primaryColor: '#ff0000',
      };

      const result = factory.validate(settings);
      expect(result.theme).toBe('dark');
      expect(result.primaryColor).toBe('#ff0000');
    });

    it('should accept reminder as string or number', () => {
      const settingsWithString = {
        reminderBefore: '30',
      };

      const settingsWithNumber = {
        reminderBefore: 30,
      };

      const result1 = factory.validate(settingsWithString);
      const result2 = factory.validate(settingsWithNumber);

      expect(result1.reminderBefore).toBe('30');
      expect(result2.reminderBefore).toBe(30);
    });
  });

  describe('partialValidate', () => {
    it('should allow partial settings update', () => {
      const partial = {
        consultationDuration: 45,
        theme: 'dark',
      };

      const result = factory.partialValidate(partial);
      expect(result.consultationDuration).toBe(45);
      expect(result.theme).toBe('dark');
    });

    it('should allow single field update', () => {
      const partial = { emailNotifications: false };
      const result = factory.partialValidate(partial);

      expect(result.emailNotifications).toBe(false);
      expect(Object.keys(result).length).toBe(1);
    });

    it('should validate partial data types', () => {
      const partial = {
        consultationDuration: 'invalid',
      };

      expect(() => factory.partialValidate(partial)).toThrow(ZodError);
    });

    it('should allow empty partial object', () => {
      const result = factory.partialValidate({});

      expect(result).toEqual({});
    });

    it('should validate array fields in partial updates', () => {
      const partial = {
        workingDays: ['Monday', 'Tuesday'],
      };

      const result = factory.partialValidate(partial);
      expect(result.workingDays).toEqual(['Monday', 'Tuesday']);
    });

    it('should allow partial prescription settings', () => {
      const partial = {
        includeQRCode: true,
        includeDoctorSignature: false,
      };

      const result = factory.partialValidate(partial);
      expect(result.includeQRCode).toBe(true);
      expect(result.includeDoctorSignature).toBe(false);
    });
  });
});
