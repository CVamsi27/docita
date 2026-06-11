import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ConsentPdfService } from './consent-pdf.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('ConsentPdfService', () => {
  const patientFindFirst = jest.fn<() => Promise<unknown>>();
  const clinicFindUnique = jest.fn<() => Promise<unknown>>();
  const prisma = {
    patient: { findFirst: patientFindFirst },
    clinic: { findUnique: clinicFindUnique },
  } as unknown as PrismaService;

  const appConfig = {
    getAppUrl: () => 'https://app.docita.work',
  } as unknown as AppConfigService;

  const service = new ConsentPdfService(prisma, appConfig);

  beforeEach(() => {
    jest.clearAllMocks();
    patientFindFirst.mockResolvedValue({ firstName: 'Asha', lastName: 'Rao' });
    clinicFindUnique.mockResolvedValue({ name: 'Sunrise Clinic' });
  });

  it('renders a non-empty PDF document for a patient', async () => {
    const buffer = await service.generateForPatient('pat-1', 'clinic-1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF magic number
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('throws when the patient is not in the clinic', async () => {
    patientFindFirst.mockResolvedValue(null);
    await expect(
      service.generateForPatient('pat-x', 'clinic-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
