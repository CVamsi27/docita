import type { ParsedMedicalFields } from '@workspace/types';

export function extractPatientName(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  const namePrefixMatch = line.match(/(?:name|patient|pt)[:\s]+([a-z\s.]+)/i);
  if (namePrefixMatch && !fields.firstName) {
    const fullName = namePrefixMatch[1].trim();
    const parts = fullName.split(' ');
    if (parts.length >= 1) fields.firstName = parts[0];
    if (parts.length >= 2) fields.lastName = parts.slice(1).join(' ');
  } else if (!fields.firstName && line.match(/^[A-Z][a-z]+\s[A-Z][a-z]+/)) {
    const commonHeaders = [
      'hospital',
      'clinic',
      'doctor',
      'dr.',
      'date',
      'age',
      'sex',
      'gender',
    ];
    if (!commonHeaders.some((h) => lowerLine.startsWith(h))) {
      const names = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
      if (names) {
        fields.firstName = names[1];
        fields.lastName = names[2];
      }
    }
  }
}

export function extractGender(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (!fields.gender || fields.gender === 'MALE') {
    if (
      lowerLine.match(/\b(?:sex|gender)[:\s]*f/i) ||
      lowerLine.match(/\bfemale\b/)
    ) {
      fields.gender = 'FEMALE';
    } else if (
      lowerLine.match(/\b(?:sex|gender)[:\s]*m/i) ||
      lowerLine.match(/\bmale\b/)
    ) {
      fields.gender = 'MALE';
    }
  }
}

export function extractAge(line: string, fields: ParsedMedicalFields): void {
  const ageMatch = line.match(/(?:age|yrs|years)[:\s]*(\d{1,3})/i);
  if (ageMatch && !fields.age) {
    fields.age = ageMatch[1];
  }
}

export function extractPreferredName(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const prefNameMatch = line.match(/(?:preferred name|alias)[:\s]+([a-z\s]+)/i);
  if (prefNameMatch) {
    fields.preferredName = prefNameMatch[1].trim();
  }
}

export function extractPronouns(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const pronounsMatch = line.match(/(?:pronouns)[:\s]+([a-z/]+)/i);
  if (pronounsMatch) {
    fields.pronouns = pronounsMatch[1].trim();
  }
}

export function extractAddress(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const addressMatch = line.match(/(?:address)[:\s]+([a-z0-9\s,.-]+)/i);
  if (addressMatch && addressMatch[1].length > 5) {
    fields.address = addressMatch[1].trim();
  }
}

export function extractMaritalStatus(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const maritalMatch = line.match(/(?:marital status)[:\s]+([a-z]+)/i);
  if (maritalMatch) {
    fields.maritalStatus = maritalMatch[1].trim();
  }
}

export function extractLanguage(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const langMatch = line.match(/(?:language)[:\s]+([a-z]+)/i);
  if (langMatch) {
    fields.preferredLanguage = langMatch[1].trim();
  }
}

export function extractRace(line: string, fields: ParsedMedicalFields): void {
  const raceMatch = line.match(/(?:race)[:\s]+([a-z]+)/i);
  if (raceMatch) {
    fields.race = raceMatch[1].trim();
  }
}

export function extractEthnicity(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const ethnicityMatch = line.match(/(?:ethnicity)[:\s]+([a-z\s]+)/i);
  if (ethnicityMatch) {
    fields.ethnicity = ethnicityMatch[1].trim();
  }
}

export function extractBloodType(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const bloodMatch = line.match(
    /\b(O|A|B|AB)\s*[+-]\s*(?:ve)?\b|\bBlood\s*Group\s*[:-]\s*(O|A|B|AB)[\s-]*([+-])/i,
  );
  if (bloodMatch && !fields.bloodType) {
    if (bloodMatch[1]) {
      fields.bloodType = bloodMatch[0].replace('ve', '').replace(/\s/g, '');
    } else if (bloodMatch[2] && bloodMatch[3]) {
      fields.bloodType = `${bloodMatch[2]}${bloodMatch[3]}`;
    }
  }
}
