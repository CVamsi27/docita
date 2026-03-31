import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('ConfigService', () => {
  let service: ConfigService;
  let prismaService: PrismaService & Record<string, unknown>;

  const mockPrismaService = {
    clinic: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
  type AppConfigWithClinicSettings = {
    clinicSettings?: {
      consultationFee?: number;
      currency?: string;
      timezone?: string;
      appointmentDuration?: number;
    };
    [key: string]: unknown;
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    tier: 'PROFESSIONAL',
    settings: {
      consultationFee: 500,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      appointmentDuration: 30,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    prismaService = module.get(PrismaService) as PrismaService &
      Record<string, unknown>;

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('getFormOptions', () => {
    it('should return all form options', () => {
      const result = service.getFormOptions();

      expect(result).toHaveProperty('gender');
      expect(result).toHaveProperty('bloodGroup');
      expect(result).toHaveProperty('appointmentType');
      expect(result).toHaveProperty('appointmentStatus');
      expect(result).toHaveProperty('invoiceStatus');
      expect(result).toHaveProperty('paymentStatus');
      expect(result).toHaveProperty('userRole');
      expect(result).toHaveProperty('weekday');
      expect(result).toHaveProperty('customFieldType');
      expect(result).toHaveProperty('templateFieldType');
      expect(result).toHaveProperty('specialty');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('appointmentDuration');
      expect(result).toHaveProperty('whatsappMessageType');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('timezone');
    });

    it('should return gender options as array', () => {
      const result = service.getFormOptions();

      expect(Array.isArray(result.gender)).toBe(true);
      expect(result.gender.length).toBeGreaterThan(0);
      expect(result.gender[0]).toHaveProperty('value');
      expect(result.gender[0]).toHaveProperty('label');
    });

    it('should return blood group options as array', () => {
      const result = service.getFormOptions();

      expect(Array.isArray(result.bloodGroup)).toBe(true);
      expect(result.bloodGroup.length).toBeGreaterThan(0);
    });

    it('should return appointment status options', () => {
      const result = service.getFormOptions();

      expect(Array.isArray(result.appointmentStatus)).toBe(true);
      expect(result.appointmentStatus.length).toBeGreaterThan(0);
    });

    it('should return payment status options', () => {
      const result = service.getFormOptions();

      expect(Array.isArray(result.paymentStatus)).toBe(true);
      expect(result.paymentStatus.length).toBeGreaterThan(0);
    });

    it('should be idempotent', () => {
      const result1 = service.getFormOptions();
      const result2 = service.getFormOptions();

      expect(result1).toEqual(result2);
    });
  });

  describe('getPatientImportFields', () => {
    it('should return patient import field definitions', () => {
      const result = service.getPatientImportFields();

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    });

    it('should be consistent across calls', () => {
      const result1 = service.getPatientImportFields();
      const result2 = service.getPatientImportFields();

      expect(result1).toEqual(result2);
    });
  });

  describe('getDefaults', () => {
    it('should return default values', () => {
      const result = service.getDefaults();

      expect(result).toHaveProperty('appointmentDuration');
      expect(result).toHaveProperty('consultationFee');
      expect(result).toHaveProperty('currency');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('invoiceItems');
    });

    it('should return numeric appointment duration', () => {
      const result = service.getDefaults();

      expect(typeof result.appointmentDuration).toBe('number');
      expect(result.appointmentDuration).toBeGreaterThan(0);
    });

    it('should return numeric consultation fee', () => {
      const result = service.getDefaults();

      expect(typeof result.consultationFee).toBe('number');
      expect(result.consultationFee).toBeGreaterThan(0);
    });

    it('should return valid currency code', () => {
      const result = service.getDefaults();

      expect(typeof result.currency).toBe('string');
      expect(result.currency.length).toBeGreaterThan(0);
    });

    it('should return valid timezone', () => {
      const result = service.getDefaults();

      expect(typeof result.timezone).toBe('string');
      expect(result.timezone.length).toBeGreaterThan(0);
    });

    it('should return invoice items', () => {
      const result = service.getDefaults();

      expect(result.invoiceItems).toBeDefined();
    });
  });

  describe('getConstants', () => {
    it('should return all global constants', () => {
      const result = service.getConstants();

      expect(result).toHaveProperty('followUpTypes');
      expect(result).toHaveProperty('reminderDays');
      expect(result).toHaveProperty('inventoryCategories');
      expect(result).toHaveProperty('queueStatuses');
      expect(result).toHaveProperty('wardTypes');
      expect(result).toHaveProperty('availableBeds');
      expect(result).toHaveProperty('teethQuadrants');
      expect(result).toHaveProperty('toothConditions');
    });

    it('should return follow up types as array', () => {
      const result = service.getConstants();

      expect(Array.isArray(result.followUpTypes)).toBe(true);
    });

    it('should return reminder days options', () => {
      const result = service.getConstants();

      expect(result.reminderDays).toBeDefined();
    });

    it('should return dental-specific constants', () => {
      const result = service.getConstants();

      expect(result.teethQuadrants).toBeDefined();
      expect(result.toothConditions).toBeDefined();
    });
  });

  describe('getAppConfig', () => {
    it('should return base config without clinicId', async () => {
      const result = await service.getAppConfig();

      expect(result).toHaveProperty('formOptions');
      expect(result).toHaveProperty('patientImportFields');
      expect(result).toHaveProperty('defaults');
      expect(result).not.toHaveProperty('clinicSettings');
    });

    it('should include clinic settings when clinicId provided', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

      const result = (await service.getAppConfig(
        'clinic-1',
      )) as AppConfigWithClinicSettings;

      expect(result).toHaveProperty('formOptions');
      expect(result).toHaveProperty('patientImportFields');
      expect(result).toHaveProperty('defaults');
      expect(result).toHaveProperty('clinicSettings');
      expect(result.clinicSettings).toHaveProperty('consultationFee', 500);
      expect(result.clinicSettings).toHaveProperty('currency', 'INR');
      expect(result.clinicSettings).toHaveProperty('timezone', 'Asia/Kolkata');
      expect(result.clinicSettings).toHaveProperty('appointmentDuration', 30);
    });

    it('should use default values when clinic has no settings', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        settings: null,
      });

      const result = (await service.getAppConfig(
        'clinic-1',
      )) as AppConfigWithClinicSettings;

      expect(result.clinicSettings).toBeDefined();
      expect(result.clinicSettings?.consultationFee).toBeDefined();
      expect(result.clinicSettings?.currency).toBeDefined();
      expect(result.clinicSettings?.timezone).toBeDefined();
    });

    it('should use default values for missing clinic settings', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        settings: { consultationFee: 1000 },
      });

      const result = (await service.getAppConfig(
        'clinic-1',
      )) as AppConfigWithClinicSettings;

      expect(result.clinicSettings?.consultationFee).toBe(1000);
      expect(result.clinicSettings?.currency).toBeDefined();
      expect(result.clinicSettings?.timezone).toBeDefined();
    });

    it('should return base config when clinic not found', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(null);

      const result = await service.getAppConfig('non-existent');

      expect(result).toHaveProperty('formOptions');
      expect(result).toHaveProperty('defaults');
      expect(result).not.toHaveProperty('clinicSettings');
    });

    it('should query clinic with correct parameters', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

      await service.getAppConfig('clinic-1');

      expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith({
        where: { id: 'clinic-1' },
        select: {
          settings: true,
          tier: true,
        },
      });
    });
  });

  describe('validateOption', () => {
    it('should validate gender options', () => {
      const formOptions = service.getFormOptions();
      const validValue = formOptions.gender[0].value;

      const result = service.validateOption('gender', validValue);

      expect(result).toBe(true);
    });

    it('should reject invalid gender value', () => {
      const result = service.validateOption('gender', 'invalid-gender');

      expect(result).toBe(false);
    });

    it('should validate appointment status options', () => {
      const formOptions = service.getFormOptions();
      const validValue = formOptions.appointmentStatus[0].value;

      const result = service.validateOption('appointmentStatus', validValue);

      expect(result).toBe(true);
    });

    it('should reject invalid appointment status', () => {
      const result = service.validateOption(
        'appointmentStatus',
        'INVALID_STATUS',
      );

      expect(result).toBe(false);
    });

    it('should validate payment status options', () => {
      const formOptions = service.getFormOptions();
      if (formOptions.paymentStatus.length > 0) {
        const validValue = formOptions.paymentStatus[0].value;

        const result = service.validateOption('paymentStatus', validValue);

        expect(result).toBe(true);
      }
    });

    it('should be case-sensitive', () => {
      const formOptions = service.getFormOptions();
      if (formOptions.gender.length > 0) {
        const validValue = formOptions.gender[0].value.toUpperCase();
        const originalValue = formOptions.gender[0].value;

        if (validValue !== originalValue) {
          const result = service.validateOption('gender', validValue);
          expect(result).toBe(false);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in getAppConfig', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.clinic.findUnique.mockRejectedValue(error);

      await expect(service.getAppConfig('clinic-1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Integration', () => {
    it('should return consistent data across methods', () => {
      const formOptions = service.getFormOptions();
      const defaults = service.getDefaults();

      expect(formOptions.appointmentDuration).toBeDefined();
      expect(defaults.appointmentDuration).toBeDefined();
    });

    it('should provide comprehensive configuration for app initialization', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

      const config = (await service.getAppConfig(
        'clinic-1',
      )) as AppConfigWithClinicSettings;
      const constants = service.getConstants();

      expect(config.formOptions).toBeDefined();
      expect(config.defaults).toBeDefined();
      expect(config.clinicSettings).toBeDefined();
      expect(constants).toBeDefined();
    });
  });
});
