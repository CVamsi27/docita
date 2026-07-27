import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

/**
 * Renders the Docita Clinic OS showcase PDF that referral partners hand
 * out to doctors / clinic owners.
 *
 * This is the v1 layout — operator-approved copy will land here in a
 * follow-up; today it carries the partner's name, code, and a QR to the
 * partner portal so the partner always has a current copy.
 *
 * Lives in the subscriptions domain (where the partner self-service
 * surface lives) and depends on no cross-domain services. Renders to a
 * Buffer synchronously; the caller is responsible for storage + signed URL.
 */

const TEAL = '#0d9488';
const INK = '#0f172a';
const MUTED = '#475569';
const SOFT = '#e2e8f0';

export interface PartnerShowcasePdfInput {
  partnerName: string;
  partnerType: 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM' | 'CLINIC';
  code: string;
  partnerPortalUrl: string;
  signupUrl: string;
}

const TYPE_LABEL: Record<PartnerShowcasePdfInput['partnerType'], string> = {
  PHARMACY: 'Pharmacy',
  MARKETING_PERSON: 'Marketing partner',
  CUSTOM: 'Referral partner',
  CLINIC: 'Clinic',
};

@Injectable()
export class PartnerShowcasePdfService {
  private readonly logger = new Logger(PartnerShowcasePdfService.name);

  async render(input: PartnerShowcasePdfInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error: Error) => reject(error));

        this.renderCover(doc, input);
        doc.addPage();
        this.renderWhatIsDocita(doc);
        doc.addPage();
        this.renderHowToOnboard(doc);
        doc.addPage();
        this.renderPartnerKit(doc, input);

        doc.end();
      } catch (error) {
        this.logger.error(
          `Failed to render partner showcase PDF for ${input.code}`,
          error instanceof Error ? error.stack : String(error),
        );
        reject(error);
      }
    });
  }

  private renderSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    const { width } = doc.page;
    doc.fontSize(22).font('Helvetica-Bold').fillColor(INK).text(title, 50, 60);
    doc
      .moveDown(0.5)
      .strokeColor(SOFT)
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(width - 50, doc.y)
      .stroke();
  }

  private renderCover(
    doc: PDFKit.PDFDocument,
    input: PartnerShowcasePdfInput,
  ): void {
    const { width, height } = doc.page;
    doc.rect(0, 0, width, height).fill(TEAL);
    doc.fillColor('#ffffff');

    doc.fontSize(14).font('Helvetica-Bold').text('DOCITA', 50, 60);
    doc.fontSize(10).font('Helvetica').text('Clinic OS, on WhatsApp', 50, 80);

    doc
      .fontSize(36)
      .font('Helvetica-Bold')
      .text('A free clinic OS', 50, height / 2 - 100, { width: width - 100 })
      .moveDown(0.2)
      .fontSize(36)
      .text('for every doctor.', 50, doc.y, { width: width - 100 });

    doc
      .moveDown(2)
      .fontSize(14)
      .font('Helvetica')
      .text(`Shared with you by ${input.partnerName}`, 50, height - 180, {
        width: width - 100,
      })
      .moveDown(0.3)
      .fontSize(12)
      .text(`${TYPE_LABEL[input.partnerType]} referral code: ${input.code}`, {
        width: width - 100,
      });

    doc.fillColor(INK);
  }

  private renderWhatIsDocita(doc: PDFKit.PDFDocument): void {
    const { width } = doc.page;
    this.renderSectionHeader(doc, 'What is Docita?');

    doc
      .moveDown(1)
      .fontSize(12)
      .font('Helvetica')
      .fillColor(INK)
      .text(
        'Docita is a free clinic operating system that runs on WhatsApp. ' +
          'It covers patient records, prescriptions, appointments, billing, ' +
          'and inventory — all from a phone or laptop, with no setup overhead.',
        50,
        doc.y,
        { width: width - 100, align: 'left' },
      );

    doc.moveDown(1);
    const features: Array<{ title: string; body: string }> = [
      { title: 'Patient records', body: 'Search, history, follow-ups.' },
      {
        title: 'Prescriptions on WhatsApp',
        body: 'Doctor sends Rx to the patient as a WhatsApp message.',
      },
      {
        title: 'Appointments & queue',
        body: 'Bookings, reminders, today list.',
      },
      { title: 'Billing & GST', body: 'Invoices, payments, GST reports.' },
      { title: 'Inventory', body: 'Pharmacy and consumables tracking.' },
    ];
    for (const feature of features) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(feature.title, 50, doc.y, { continued: false });
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(MUTED)
        .text(feature.body, 50, doc.y, { width: width - 100 });
      doc.moveDown(0.5);
      doc.fillColor(INK);
    }
  }

  private renderHowToOnboard(doc: PDFKit.PDFDocument): void {
    const { width } = doc.page;
    this.renderSectionHeader(doc, 'Onboard in 2 minutes');

    const steps: Array<{ title: string; body: string }> = [
      {
        title: '1. Text START',
        body: 'Doctor sends START to the Docita WhatsApp number.',
      },
      { title: '2. Verify phone', body: "One-time OTP on the doctor's phone." },
      {
        title: '3. Add clinic details',
        body: 'Clinic name, address, GSTIN (optional).',
      },
      {
        title: '4. Start using',
        body: 'Add first patient, send first prescription.',
      },
    ];

    doc.moveDown(1);
    for (const step of steps) {
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(TEAL)
        .text(step.title, 50, doc.y);
      doc
        .moveDown(0.2)
        .font('Helvetica')
        .fontSize(12)
        .fillColor(INK)
        .text(step.body, 50, doc.y, { width: width - 100 });
      doc.moveDown(0.6);
    }
  }

  private renderPartnerKit(
    doc: PDFKit.PDFDocument,
    input: PartnerShowcasePdfInput,
  ): Promise<void> {
    const { width } = doc.page;
    this.renderSectionHeader(doc, 'Your partnership kit');

    doc
      .moveDown(1)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Referral code', 50, doc.y);
    doc
      .font('Helvetica')
      .fontSize(20)
      .fillColor(TEAL)
      .text(input.code, 50, doc.y);

    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(INK)
      .text('Partner portal', 50, doc.y);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED)
      .text(input.partnerPortalUrl, 50, doc.y, { width: width - 100 });

    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(INK)
      .text('Doctor signup (auto-applies your code)', 50, doc.y);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED)
      .text(input.signupUrl, 50, doc.y, { width: width - 100 });

    // QR code for the signup URL — scan to onboard.
    return QRCode.toBuffer(input.signupUrl, {
      margin: 1,
      width: 220,
      color: { dark: INK, light: '#ffffff' },
    }).then((qrPng) => {
      doc.image(qrPng, width - 50 - 220, 320, { width: 220, height: 220 });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(MUTED)
        .text('Scan to sign up with your code applied.', 50, 560, {
          width: width - 100,
        });
    });
  }
}
