import { describe, it, expect } from '@jest/globals';
import { OpdSlipPdfService, type OpdSlipData } from './opd-slip-pdf.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const clock: IClock = { now: () => new Date('2026-06-02T09:00:00.000Z') };

const baseData: OpdSlipData = {
  documentId: 'APPT1234',
  clinic: { name: 'Test Clinic', address: '1 Main St', phone: '99999' },
  patient: { name: 'Jane Doe', age: 30, gender: 'F', patientId: 'PT123456' },
};

describe('OpdSlipPdfService', () => {
  const service = new OpdSlipPdfService(clock);

  it('produces a non-empty PDF document', async () => {
    const buffer = await service.generate(baseData);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('renders with a configured free-revisit window', async () => {
    const buffer = await service.generate({
      ...baseData,
      revisitValidityDays: 7,
      footerNote: 'Bring previous reports.',
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
});
