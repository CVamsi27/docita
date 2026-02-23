import {
  FieldConfidenceConfig,
  OcrExtractedFields,
  OcrRawData,
} from '@workspace/types';
import { normalizeOcrFields } from './ocr-field-normalizer';

export function basicOcrParsing(
  ocrText: string,
  config: FieldConfidenceConfig,
): OcrExtractedFields {
  const patterns = {
    firstName: /first\s*name[:\s]+([^\n,]+)/i,
    lastName: /last\s*name[:\s]+([^\n,]+)/i,
    age: /age[:\s]+(\d+)/i,
    phoneNumber: /phone[:\s]+([\d\s\-+()]+)/i,
    email: /email[:\s]+([^\s@]+@[^\s@]+)/i,
    bloodType: /blood\s*(?:type|group)[:\s]+([OAB+-]+)/i,
    bp: /(?:bp|blood\s*pressure)[:\s]+(\d+\/\d+)/i,
    temp: /(?:temp|temperature)[:\s]+(\d+\.?\d*)\s*[°c]/i,
    pulse: /(?:pulse|heart\s*rate)[:\s]+(\d+)/i,
    diagnosis: /(?:diagnosis|impression)[:\s]*([^\n]+)/i,
    doctorName: /(?:doctor|dr|physician)[:\s]+([^\n,]+)/i,
    clinicName: /(?:clinic|hospital|centre)[:\s]+([^\n,]+)/i,
    visitDate:
      /(?:date|visit\s*date|appointment)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    invoiceNumber: /(?:invoice|bill)[:\s]*(?:no|number)[:\s]+([^\n,]+)/i,
    totalAmount: /(?:total|amount)[:\s]+(?:₹|$|rs)?(\d+\.?\d*)/i,
  };

  const extract = (pattern: RegExp): string => {
    const match = ocrText.match(pattern);
    return match ? match[1]?.trim() || '' : '';
  };

  const data: Partial<OcrRawData> = {
    firstName: extract(patterns.firstName),
    lastName: extract(patterns.lastName),
    age: extract(patterns.age),
    phoneNumber: extract(patterns.phoneNumber),
    email: extract(patterns.email),
    bloodType: extract(patterns.bloodType),
    diagnosis: extract(patterns.diagnosis),
    vitals: {
      bp: extract(patterns.bp),
      temp: extract(patterns.temp),
      pulse: extract(patterns.pulse),
    },
    doctorName: extract(patterns.doctorName),
    clinicName: extract(patterns.clinicName),
    visitDate: extract(patterns.visitDate),
    invoice: {
      invoiceNumber: extract(patterns.invoiceNumber),
      totalAmount: extract(patterns.totalAmount),
    },
  };

  return normalizeOcrFields(data as OcrRawData, config);
}
