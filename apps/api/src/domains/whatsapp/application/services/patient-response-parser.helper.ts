import {
  EXACT_RESPONSE_MAPPING,
  INCLUDES_RESPONSE_PATTERNS,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';

export function parsePatientResponse(text: string): PatientResponseType {
  const normalized = text.toLowerCase().trim();

  if (EXACT_RESPONSE_MAPPING[normalized]) {
    return EXACT_RESPONSE_MAPPING[normalized];
  }

  for (const pattern of INCLUDES_RESPONSE_PATTERNS) {
    if (normalized.includes(pattern.needle)) {
      return pattern.type;
    }
  }

  return 'UNKNOWN';
}

export function extractDelayMinutes(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  const patterns = [
    /^(\d{1,3})$/i,
    /(?:^|\s)(\d{1,3})\s*min(?:ute)?s?(?:\s|$)/i,
    /running\s*(\d{1,3})\s*late/i,
    /late\s*by\s*(\d{1,3})/i,
    /(?:^|\s)(\d{1,3})\s*(?:mins?)\s*late/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const minutes = parseInt(match[1], 10);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return null;
    }
    return minutes;
  }

  return null;
}
