import type { ParsedMedicalFields } from '@workspace/types';

export function extractPhoneNumber(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const phoneMatch = line.match(
    /(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}\b/,
  );
  if (phoneMatch && !fields.phoneNumber) {
    fields.phoneNumber = phoneMatch[0].replace(/\D/g, '').slice(-10);
  }
}

export function extractEmail(line: string, fields: ParsedMedicalFields): void {
  const emailMatch = line.match(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  );
  if (emailMatch && !fields.email) {
    fields.email = emailMatch[1];
  }
}

export function extractEmergencyContact(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const ecMatch = line.match(
    /(?:emergency contact|emergency)[:\s]+([a-z\s]+)(?:[:\s-]+)?(\d+)?/i,
  );
  if (ecMatch) {
    fields.emergencyContact = {
      name: ecMatch[1].trim(),
      phoneNumber: ecMatch[2] ? ecMatch[2].trim() : '',
      relation: '',
    };
  }
}
