import PDFDocument from 'pdfkit';
import type { PDFDoctorInfo, PDFPatientInfo } from './pdf.types';

export function renderPatientInfoColumn(params: {
  doc: typeof PDFDocument.prototype;
  patient: PDFPatientInfo;
  x: number;
  y: number;
}): number {
  let currentY = renderSectionHeader(
    params.doc,
    'Patient Details',
    params.x,
    params.y,
  );
  params.doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(params.patient.name, params.x, currentY);
  currentY += 13;
  params.doc.font('Helvetica');
  currentY = renderOptionalLine(
    params.doc,
    patientDetails(params.patient).join(' | '),
    params.x,
    currentY,
  );
  currentY = renderOptionalLine(
    params.doc,
    params.patient.phoneNumber ? `Phone: ${params.patient.phoneNumber}` : '',
    params.x,
    currentY,
  );
  currentY = renderMutedLine(
    params.doc,
    params.patient.patientId ? `ID: ${params.patient.patientId}` : '',
    params.x,
    currentY,
  );
  return renderOptionalLine(
    params.doc,
    patientVitals(params.patient).join(' | '),
    params.x,
    currentY,
  );
}

export function renderDoctorInfoColumn(params: {
  doc: typeof PDFDocument.prototype;
  doctor: PDFDoctorInfo;
  x: number;
  y: number;
}): number {
  let currentY = renderSectionHeader(
    params.doc,
    'Treating Physician',
    params.x,
    params.y,
  );
  params.doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(`Dr. ${params.doctor.name}`, params.x, currentY);
  currentY += 13;
  params.doc.font('Helvetica');
  currentY = renderOptionalLine(
    params.doc,
    params.doctor.qualification,
    params.x,
    currentY,
  );
  currentY = renderOptionalLine(
    params.doc,
    params.doctor.specialization,
    params.x,
    currentY,
  );
  return renderMutedLine(
    params.doc,
    params.doctor.registrationNumber
      ? `Reg. No: ${params.doctor.registrationNumber}`
      : '',
    params.x,
    currentY,
  );
}

function renderSectionHeader(
  doc: typeof PDFDocument.prototype,
  title: string,
  x: number,
  y: number,
): number {
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1e3a5f')
    .text(title, x, y)
    .fillColor('#000000');
  return y + 16;
}

function renderOptionalLine(
  doc: typeof PDFDocument.prototype,
  value: string | undefined,
  x: number,
  y: number,
): number {
  if (!value) return y;
  doc.text(value, x, y);
  return y + 12;
}

function renderMutedLine(
  doc: typeof PDFDocument.prototype,
  value: string,
  x: number,
  y: number,
): number {
  if (!value) return y;
  doc.fillColor('#666666').text(value, x, y).fillColor('#000000');
  return y + 12;
}

function patientDetails(patient: PDFPatientInfo): string[] {
  return [
    patient.age !== undefined ? `${patient.age} yrs` : '',
    patient.gender ?? '',
    patient.bloodGroup ? `Blood: ${patient.bloodGroup}` : '',
  ].filter(Boolean);
}

function patientVitals(patient: PDFPatientInfo): string[] {
  return [
    patient.weight ? `Wt: ${patient.weight}kg` : '',
    patient.height ? `Ht: ${patient.height}cm` : '',
  ].filter(Boolean);
}
