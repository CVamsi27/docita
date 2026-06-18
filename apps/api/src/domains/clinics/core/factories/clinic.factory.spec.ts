import { Test, TestingModule } from '@nestjs/testing';
import { ClinicFactory } from './clinic.factory';
import { SettingsFactory } from './settings.factory';
import { ClinicTier } from '@workspace/db';

describe('ClinicFactory', () => {
  let factory: ClinicFactory;
  let settingsFactory: SettingsFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicFactory,
        {
          provide: SettingsFactory,
          useValue: {
            createDefault: jest.fn().mockReturnValue({ testSetting: true }),
          },
        },
      ],
    }).compile();

    factory = module.get<ClinicFactory>(ClinicFactory);
    settingsFactory = module.get<SettingsFactory>(SettingsFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('create', () => {
    it('should create clinic input with defaults', () => {
      const data = {
        name: 'Test Clinic',
        email: 'test@clinic.com',
      };

      const result = factory.create(data);

      expect(result).toEqual({
        name: data.name,
        email: data.email,
        phone: '',
        address: '',
        tier: 'ESSENTIAL',
        active: true,
        settings: { testSetting: true },
      });
    });

    it('should create clinic input with provided values and settings', () => {
      const data = {
        name: 'Test Clinic',
        email: 'test@clinic.com',
        phone: '1234567890',
        address: '123 St',
        tier: 'ESSENTIAL' as ClinicTier,
        settings: { customField: 'value' },
      };

      const result = factory.create(data);

      expect(result).toEqual({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: 'ESSENTIAL',
        active: true,
        settings: { testSetting: true, customField: 'value' },
      });
    });
  });
});
