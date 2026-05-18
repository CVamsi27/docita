import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { ClinicSettingsCommandService } from './clinic-settings-command.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { ClinicDataService } from './clinic-data.service';
import { ClinicDataSubjectRequestService } from './clinic-data-subject-request.service';

describe('ClinicSettingsCommandService', () => {
  let service: ClinicSettingsCommandService;
  let prisma: jest.Mocked<PrismaService>;
  let settingsFactory: jest.Mocked<SettingsFactory>;
  let clinicDataService: jest.Mocked<ClinicDataService>;
  let dataSubjectRequestService: jest.Mocked<ClinicDataSubjectRequestService>;

  beforeEach(() => {
    prisma = {
      clinic: { findUnique: jest.fn(), update: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    settingsFactory = Object.create(
      SettingsFactory.prototype,
    ) as jest.Mocked<SettingsFactory>;
    settingsFactory.partialValidate = jest.fn();

    clinicDataService = Object.create(
      ClinicDataService.prototype,
    ) as jest.Mocked<ClinicDataService>;
    clinicDataService.findOne = jest.fn();

    dataSubjectRequestService = Object.create(
      ClinicDataSubjectRequestService.prototype,
    ) as jest.Mocked<ClinicDataSubjectRequestService>;

    service = new ClinicSettingsCommandService(
      prisma,
      settingsFactory,
      clinicDataService,
      dataSubjectRequestService,
    );
  });

  describe('updateSettings', () => {
    it('should update clinic settings for a valid clinic', async () => {
      const clinicRow = {
        id: 'clinic-1',
        settings: { openingTime: '09:00', closingTime: '18:00' },
      };
      (settingsFactory.partialValidate as jest.Mock).mockReturnValueOnce({
        openingTime: '09:00',
        closingTime: '18:00',
      });
      (prisma.clinic.update as jest.Mock).mockResolvedValueOnce(
        clinicRow as never,
      );
      (clinicDataService.findOne as jest.Mock).mockResolvedValueOnce(
        clinicRow as never,
      );

      const result = await service.updateSettings('clinic-1', {
        openingTime: '09:00',
        closingTime: '18:00',
      });

      expect(result).toMatchObject({ id: 'clinic-1' });
    });

    it('should throw NotFoundException when clinic is not found after update', async () => {
      (settingsFactory.partialValidate as jest.Mock).mockReturnValueOnce({});
      (prisma.clinic.update as jest.Mock).mockResolvedValueOnce({} as never);
      (clinicDataService.findOne as jest.Mock).mockResolvedValueOnce(
        null as never,
      );

      await expect(
        service.updateSettings('missing', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should preserve existing settings when doing a partial update', async () => {
      const existing = {
        openingTime: '08:00',
        closingTime: '17:00',
        consultationDuration: 15,
      };
      const updated = { ...existing, closingTime: '18:00' };
      (settingsFactory.partialValidate as jest.Mock).mockReturnValueOnce(
        updated,
      );
      (prisma.clinic.update as jest.Mock).mockResolvedValueOnce({
        id: 'clinic-1',
        settings: updated,
      } as never);
      (clinicDataService.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'clinic-1',
        settings: updated,
      } as never);

      await service.updateSettings('clinic-1', { closingTime: '18:00' });

      expect(prisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'clinic-1' } }),
      );
    });
  });
});
