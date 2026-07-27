import { describe, expect, it } from '@jest/globals';
import { PartnerShowcasePdfService } from './partner-showcase-pdf.service';

describe('PartnerShowcasePdfService', () => {
  const service = new PartnerShowcasePdfService();

  it('renders a non-trivial PDF buffer for every partner type', async () => {
    const inputs: Array<Parameters<typeof service.render>[0]> = [
      {
        partnerName: 'Anil Pharmacy',
        partnerType: 'PHARMACY',
        code: 'RFR-AB23CD',
        partnerPortalUrl: 'https://app.docita.work/partner',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-AB23CD',
      },
      {
        partnerName: 'Bharat Marketing',
        partnerType: 'MARKETING_PERSON',
        code: 'RFR-XY7KLM',
        partnerPortalUrl: 'https://app.docita.work/partner',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-XY7KLM',
      },
      {
        partnerName: 'Chirayu Wellness',
        partnerType: 'CUSTOM',
        code: 'RFR-QQ2233',
        partnerPortalUrl: 'https://app.docita.work/partner',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-QQ2233',
      },
      {
        partnerName: 'Sunrise Clinic',
        partnerType: 'CLINIC',
        code: 'RFR-CL4444',
        partnerPortalUrl: 'https://app.docita.work/partner',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-CL4444',
      },
    ];

    for (const input of inputs) {
      const buf = await service.render(input);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(1000);
      // PDF magic header.
      expect(buf.slice(0, 4).toString('latin1')).toBe('%PDF');
      // EOF marker (PDFKit always emits one).
      const tail = buf.slice(-32).toString('latin1');
      expect(tail).toContain('%%EOF');
    }
  });

  it('emits a different buffer for two different partner names (cache-busting)', async () => {
    const a = await service.render({
      partnerName: 'A',
      partnerType: 'PHARMACY',
      code: 'RFR-AB23CD',
      partnerPortalUrl: 'https://app.docita.work/partner',
      signupUrl: 'https://app.docita.work/onboarding',
    });
    const b = await service.render({
      partnerName: 'B',
      partnerType: 'PHARMACY',
      code: 'RFR-AB23CD',
      partnerPortalUrl: 'https://app.docita.work/partner',
      signupUrl: 'https://app.docita.work/onboarding',
    });
    expect(Buffer.compare(a, b)).not.toBe(0);
  });
});
