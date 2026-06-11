import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { DPDP_NOTICE_VERSION } from '@workspace/types';
import { getPatientFullName } from '@workspace/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { appendPdfPoweredByDocita } from '@/shared/modules/document-generation/pdf/pdf-branding';

const TEAL = '#0d9488';
const INK = '#0f172a';
const MUTED = '#475569';

/**
 * Single-page DPDP patient-consent sheet. The clinic prints/hands it to the
 * patient; it carries a QR to the patient portal where they can log in to view,
 * export, or delete their data. Plain-language, DPDP-aligned.
 */
@Injectable()
export class ConsentPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  async generateForPatient(
    patientId: string,
    clinicId: string,
  ): Promise<Buffer> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { firstName: true, lastName: true },
    });
    if (!patient)
      throw new NotFoundException('Patient was not found in this clinic');

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const portalUrl = `${this.appConfig.getAppUrl().replace(/\/$/, '')}/portal`;
    const qrPng = await QRCode.toBuffer(portalUrl, {
      margin: 1,
      width: 240,
      color: { dark: INK, light: '#ffffff' },
    });

    return this.render({
      clinicName: clinic?.name ?? 'Your clinic',
      patientName: getPatientFullName({
        firstName: patient.firstName,
        lastName: patient.lastName,
      }),
      portalUrl,
      qrPng,
      grievanceEmail: this.appConfig.getGrievanceContactEmail(),
    });
  }

  private render(input: {
    clinicName: string;
    patientName: string;
    portalUrl: string;
    qrPng: Buffer;
    grievanceEmail: string;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Header
    doc
      .fillColor(TEAL)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('Docita', { continued: true })
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(10)
      .text('   Clinic OS');
    doc
      .moveTo(48, 84)
      .lineTo(547, 84)
      .strokeColor(TEAL)
      .lineWidth(1.5)
      .stroke();

    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('Patient Data Consent', 48, 98)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('Digital Personal Data Protection Act, 2023');

    doc.moveDown(0.8);
    doc
      .fillColor(INK)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Clinic: `, { continued: true })
      .font('Helvetica')
      .text(input.clinicName);
    doc
      .font('Helvetica-Bold')
      .text(`Patient: `, { continued: true })
      .font('Helvetica')
      .text(input.patientName);

    const section = (title: string, body: string) => {
      doc.moveDown(0.6);
      doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(10).text(title);
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(9.5)
        .text(body, { lineGap: 1.5 });
    };

    section(
      'What we collect',
      'Your name, contact details and demographics, and the clinical records created during care — visits, prescriptions, vitals, lab results — and billing information.',
    );
    section(
      'Why we use it',
      'To provide and coordinate your care, manage appointments and prescriptions, handle billing, and send you appointment and care reminders.',
    );
    section(
      'Who it may be shared with',
      "Your clinic's authorised staff; messaging providers (WhatsApp / SMS / email) for reminders, with your consent; the payment provider for billing; and the ABDM/ABHA network only if you choose to link your health ID. AI processing is currently disabled.",
    );
    section(
      'Your rights — anytime',
      'You can access, correct, export, or delete your data, and withdraw this consent, at any time. Scan the code below to log in and manage your data yourself.',
    );

    // QR block
    const qrY = doc.y + 10;
    doc.image(input.qrPng, 48, qrY, { width: 96 });
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Manage your data', 160, qrY + 6)
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(
        'Scan to log in to your patient portal to view, download, or delete your records.',
        160,
        qrY + 22,
        { width: 350 },
      )
      .fillColor(TEAL)
      .fontSize(8.5)
      .text(input.portalUrl, 160, qrY + 54);

    // Signature
    const sigY = qrY + 120;
    doc
      .fillColor(INK)
      .font('Helvetica')
      .fontSize(9.5)
      .text(
        'I have read and understood the above and consent to the processing of my personal data as described.',
        48,
        sigY,
        { width: 499 },
      );
    const lineY = sigY + 44;
    doc.fillColor(MUTED).fontSize(9);
    doc.text('Patient / Guardian signature', 48, lineY + 4);
    doc
      .moveTo(200, lineY)
      .lineTo(330, lineY)
      .strokeColor(MUTED)
      .lineWidth(0.7)
      .stroke();
    doc.text('Date', 360, lineY + 4);
    doc.moveTo(390, lineY).lineTo(500, lineY).stroke();
    doc.text(
      'For a minor, the guardian signs on the patient’s behalf.',
      48,
      lineY + 22,
    );

    // Grievance / data-protection contact (DPDP)
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Grievance / data-protection contact: ', 48, lineY + 40, {
        continued: true,
      })
      .fillColor(TEAL)
      .font('Helvetica')
      .text(input.grievanceEmail);

    // Footer
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        appendPdfPoweredByDocita(`Consent notice ${DPDP_NOTICE_VERSION}`),
        48,
        790,
        { align: 'center', width: 499 },
      );

    doc.end();
    return done;
  }
}
