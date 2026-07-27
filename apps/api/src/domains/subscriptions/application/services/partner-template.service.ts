import { Injectable, Logger } from '@nestjs/common';

/**
 * Renders the WABA template body and components for a referral partner
 * welcome message. The template text itself lives on the WhatsApp
 * Business account (operator registers `partner_welcome_v1`); the code's
 * job is to fill the placeholders + build the components.
 *
 * WABA template `partner_welcome_v1` (v1 — operator fills the body text):
 *   Header: document (the showcase PDF, hosted at a signed URL)
 *   Body placeholders:
 *     {{1}} = partner name
 *     {{2}} = type label (Pharmacy / Marketing / Custom / Clinic)
 *     {{3}} = referral code
 *     {{4}} = partner portal URL
 *     {{5}} = share message (multi-line, no emoji)
 *   Button (optional): URL with token = the partner portal URL.
 *
 * No emoji is rendered into any string — the brand voice is
 * no-emoji. WABA template must also use no emoji.
 */

const TYPE_LABEL: Record<string, string> = {
  PHARMACY: 'Pharmacy',
  MARKETING_PERSON: 'Marketing partner',
  CUSTOM: 'Referral partner',
  CLINIC: 'Clinic',
};

export interface PartnerTemplateInput {
  partnerName: string;
  partnerType: 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM' | 'CLINIC';
  code: string;
  partnerPortalUrl: string;
  shareMessage: string;
  /** Signed URL to the showcase PDF, hosted in storage. */
  pdfUrl: string;
  /** Filename shown to the WhatsApp recipient. */
  pdfFilename?: string;
}

export interface PartnerTemplate {
  templateName: string;
  languageCode: string;
  components: Array<Record<string, unknown>>;
}

@Injectable()
export class PartnerTemplateService {
  private readonly logger = new Logger(PartnerTemplateService.name);

  /** Render the partner share message (copy-paste-able WhatsApp text). */
  renderShareMessage(input: {
    partnerName: string;
    code: string;
    signupUrl: string;
  }): string {
    return [
      'Hi,',
      '',
      'I wanted to share something useful for your practice.',
      '',
      'Docita is a free clinic OS that runs on WhatsApp - patient records, prescriptions, appointments, billing, all from your phone or laptop. Takes 2 minutes to set up.',
      '',
      `Sign up here with my code ${input.code} and you get a free month on your first subscription:`,
      input.signupUrl,
      '',
      'Happy to walk you through it whenever you have 5 minutes.',
      '',
      input.partnerName,
      'Docita Referral Partner',
    ].join('\n');
  }

  /** Build the WABA template components for the welcome message. */
  renderWelcomeComponents(input: PartnerTemplateInput): PartnerTemplate {
    const typeLabel = TYPE_LABEL[input.partnerType] ?? 'Referral partner';

    const components: Array<Record<string, unknown>> = [
      // Header — document (the showcase PDF).
      {
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: input.pdfUrl,
              filename: input.pdfFilename ?? 'docita-partner-showcase.pdf',
            },
          },
        ],
      },
      // Body — five text placeholders.
      {
        type: 'body',
        parameters: [
          { type: 'text', text: input.partnerName },
          { type: 'text', text: typeLabel },
          { type: 'text', text: input.code },
          { type: 'text', text: input.partnerPortalUrl },
          { type: 'text', text: input.shareMessage },
        ],
      },
      // URL button — opens the partner portal. The token is the URL itself
      // (WABA URL buttons have a fixed prefix; we pass the full path as
      // the token so the resulting URL is the partner portal URL).
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: input.partnerPortalUrl }],
      },
    ];

    return {
      templateName: 'partner_welcome_v1',
      languageCode: 'en',
      components,
    };
  }
}
