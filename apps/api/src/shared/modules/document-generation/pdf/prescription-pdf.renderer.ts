import { Injectable } from '@nestjs/common';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import { PdfLayoutService } from './pdf-layout.service';
import type { PDFConfig, PrescriptionPdfInput } from './pdf.types';

@Injectable()
export class PrescriptionPdfRenderer {
  constructor(private readonly layout: PdfLayoutService) {}

  buildConfig(data: PrescriptionPdfInput): PDFConfig {
    const validityDays = data.validityDays ?? 30;

    return {
      type: 'prescription',
      title: 'PRESCRIPTION',
      documentId: data.prescriptionId,
      clinic: data.clinic,
      doctor: data.doctor,
      patient: data.patient,
      date: data.date,
      showRxSymbol: true,
      validityDays,
      sections: [
        (doc, ctx) => {
          if (data.diagnosis) {
            ctx.currentY = this.layout.renderSection(
              doc,
              'Chief Complaint / Diagnosis',
              data.diagnosis,
              ctx,
            );
          }
        },

        (doc, ctx, layout) => {
          ctx.currentY = layout.renderMedicationsTable(
            doc,
            data.medications,
            ctx,
          );
        },

        (doc, ctx) => {
          if (data.instructions) {
            ctx.currentY += 15;
            ctx.currentY = this.layout.renderSection(
              doc,
              'Special Instructions',
              data.instructions,
              ctx,
            );
          }
        },

        (doc, ctx) => {
          if (data.patient.allergies?.length) {
            ctx.currentY += 10;
            this.layout.renderWarningBox(
              doc,
              `Known Allergies: ${data.patient.allergies.join(', ')}`,
              ctx,
            );
            ctx.currentY += 40;
          }
        },

        (doc, ctx) => {
          if (data.nextVisit) {
            ctx.currentY += 10;
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .text(
                `Next Visit: ${formatDate(
                  data.nextVisit,
                  DATE_FORMATS.DATE_FULL,
                )}`,
                ctx.margin,
                ctx.currentY,
              );
            ctx.currentY += 20;
          }
        },

        (doc, ctx, layout) => {
          ctx.currentY = layout.renderAbbreviationLegend(
            doc,
            data.medications,
            ctx,
          );
        },
      ],
      footerText: `This prescription is valid for ${validityDays} days from the date of issue. Not valid for medico-legal purposes.`,
    };
  }
}
