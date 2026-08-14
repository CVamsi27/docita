import { describe, expect, it } from '@jest/globals';
import { PartnerTemplateService } from './partner-template.service';

describe('PartnerTemplateService', () => {
  const service = new PartnerTemplateService();

  describe('renderShareMessage', () => {
    it('includes the partner name, code, and signup URL', () => {
      const msg = service.renderShareMessage({
        partnerName: 'Anil Pharmacy',
        code: 'RFR-AB23CD',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-AB23CD',
      });
      expect(msg).toContain('Anil Pharmacy');
      expect(msg).toContain('RFR-AB23CD');
      expect(msg).toContain(
        'https://app.docita.work/onboarding?ref=RFR-AB23CD',
      );
    });

    it('contains no emoji (brand voice)', () => {
      const msg = service.renderShareMessage({
        partnerName: 'Anil',
        code: 'RFR-AB23CD',
        signupUrl: 'https://app.docita.work/onboarding?ref=RFR-AB23CD',
      });

      expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(msg)).toBe(false);
    });

    it('ends with the partner name + role line', () => {
      const msg = service.renderShareMessage({
        partnerName: 'Anil',
        code: 'RFR-AB23CD',
        signupUrl: 'https://app.docita.work/onboarding',
      });
      const lines = msg.split('\n');
      expect(lines[lines.length - 1]).toBe('Docita Referral Partner');
      expect(lines[lines.length - 2]).toBe('Anil');
    });
  });

  describe('renderWelcomeComponents', () => {
    const baseInput = {
      partnerName: 'Anil Pharmacy',
      partnerType: 'PHARMACY' as const,
      code: 'RFR-AB23CD',
      partnerPortalUrl: 'https://app.docita.work/partner',
      shareMessage: 'Line 1\nLine 2',
      pdfUrl: 'https://storage.docita.work/p/partner-showcase?signature=abc',
    };

    it('uses the documented template name and language code', () => {
      const tpl = service.renderWelcomeComponents(baseInput);
      expect(tpl.templateName).toBe('partner_welcome_v1');
      expect(tpl.languageCode).toBe('en');
    });

    it('emits three components in the canonical order: header, body, button', () => {
      const tpl = service.renderWelcomeComponents(baseInput);
      expect(tpl.components).toHaveLength(3);
      expect(tpl.components[0]?.type).toBe('header');
      expect(tpl.components[1]?.type).toBe('body');
      expect(tpl.components[2]?.type).toBe('button');
    });

    it('packs the PDF URL into the header document', () => {
      const tpl = service.renderWelcomeComponents(baseInput);
      const header = tpl.components[0] as {
        parameters: Array<{
          type: string;
          document: { link: string; filename: string };
        }>;
      };
      expect(header.parameters[0]?.type).toBe('document');
      expect(header.parameters[0]?.document.link).toBe(baseInput.pdfUrl);
      expect(header.parameters[0]?.document.filename).toBe(
        'docita-partner-showcase.pdf',
      );
    });

    it('overrides the PDF filename when provided', () => {
      const tpl = service.renderWelcomeComponents({
        ...baseInput,
        pdfFilename: 'anil-docita-kit.pdf',
      });
      const header = tpl.components[0] as {
        parameters: Array<{
          document: { filename: string };
        }>;
      };
      expect(header.parameters[0]?.document.filename).toBe(
        'anil-docita-kit.pdf',
      );
    });

    it('packs the 5 body placeholders in the documented order', () => {
      const tpl = service.renderWelcomeComponents(baseInput);
      const body = tpl.components[1] as {
        parameters: Array<{ type: string; text: string }>;
      };
      expect(body.parameters).toHaveLength(5);
      expect(body.parameters[0]?.text).toBe('Anil Pharmacy');
      expect(body.parameters[1]?.text).toBe('Pharmacy');
      expect(body.parameters[2]?.text).toBe('RFR-AB23CD');
      expect(body.parameters[3]?.text).toBe('https://app.docita.work/partner');
      expect(body.parameters[4]?.text).toBe('Line 1\nLine 2');
    });

    it('falls back to a generic type label for unknown partner types', () => {
      const tpl = service.renderWelcomeComponents({
        ...baseInput,
        // Bypass the type-narrowed input with a cast to simulate future
        // partner kinds the type map doesn't know about yet.
        partnerType: 'CUSTOM' as 'PHARMACY',
      });
      const body = tpl.components[1] as {
        parameters: Array<{ text: string }>;
      };
      expect(body.parameters[1]?.text).toBe('Referral partner');
    });

    it('maps every known partner type to a human label', () => {
      const cases: Array<{
        type: 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM' | 'CLINIC';
        label: string;
      }> = [
        { type: 'PHARMACY', label: 'Pharmacy' },
        { type: 'MARKETING_PERSON', label: 'Marketing partner' },
        { type: 'CUSTOM', label: 'Referral partner' },
        { type: 'CLINIC', label: 'Clinic' },
      ];
      for (const { type, label } of cases) {
        const tpl = service.renderWelcomeComponents({
          ...baseInput,
          partnerType: type,
        });
        const body = tpl.components[1] as {
          parameters: Array<{ text: string }>;
        };
        expect(body.parameters[1]?.text).toBe(label);
      }
    });

    it('emits a URL button (sub_type url) pointing at the partner portal', () => {
      const tpl = service.renderWelcomeComponents(baseInput);
      const button = tpl.components[2] as {
        sub_type: string;
        index: number;
        parameters: Array<{ type: string; text: string }>;
      };
      expect(button.sub_type).toBe('url');
      expect(button.index).toBe(0);
      expect(button.parameters[0]?.text).toBe(
        'https://app.docita.work/partner',
      );
    });
  });
});
