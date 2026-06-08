import type { ParsedMedicalFields } from '@workspace/types';

export function extractClinicName(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const clinicMatch = line.match(
    /(?:hospital|clinic|center)[:\s]+([a-z\s.]+)/i,
  );
  if (clinicMatch && !fields.clinicName) {
    fields.clinicName = clinicMatch[1].trim();
  }
}

export function extractDoctorName(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const doctorMatch = line.match(/(?:doctor|dr.?)[:\s]+([a-z\s.]+)/i);
  if (doctorMatch && !fields.doctorName) {
    fields.doctorName = doctorMatch[1].trim();
  }
}

export function extractDates(line: string, fields: ParsedMedicalFields): void {
  const lowerLine = line.toLowerCase();
  const dateRegex = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
  const dateMatch = line.match(dateRegex);
  if (dateMatch) {
    if (lowerLine.includes('dob') || lowerLine.includes('birth')) {
      fields.dateOfBirth = dateMatch[1];
    } else if (lowerLine.includes('invoice') || lowerLine.includes('bill')) {
      fields.invoiceDate = dateMatch[1];
    } else if (lowerLine.includes('admission') || lowerLine.includes('admit')) {
      fields.admissionDate = dateMatch[1];
    } else if (
      (lowerLine.includes('visit') || lowerLine.includes('date')) &&
      !fields.visitDate
    ) {
      fields.visitDate = dateMatch[1];
    }
  }
}

export function extractMrn(line: string, fields: ParsedMedicalFields): void {
  const mrnMatch = line.match(
    /(?:mrn|medical record number)[:\s]+([a-z0-9-.]+)/i,
  );
  if (mrnMatch) {
    fields.mrn = mrnMatch[1].trim();
  }
}
