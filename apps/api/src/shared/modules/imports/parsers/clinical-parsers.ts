import type { ParsedMedicalFields } from '@workspace/types';
import { OCRMedication as Medication } from '@workspace/types';

export function extractDiagnosis(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (
    (lowerLine.includes('diagnosis') ||
      lowerLine.includes('diagnosed') ||
      lowerLine.includes('imp:')) &&
    !fields.diagnosis
  ) {
    const diagMatch = line.match(/(?:diagnosis|imp)[:\s]+([^,]+)/i);
    if (diagMatch) {
      fields.diagnosis = diagMatch[1].trim();
    }
  }
}

export function extractMedications(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (fields.medications.length >= 10) return;

  const medMatch = line.match(
    /(?:^\d+.?\s*)?([a-zA-Z\s]+?)\s*[-:]?\s*(\d+\s*(?:mg|ml|tabs?|units?|caps?|gm))/i,
  );
  if (
    medMatch &&
    lowerLine.includes('medication') === false &&
    lowerLine.includes('temp') === false
  ) {
    const med: Medication = {
      name: medMatch[1].trim(),
      dosage: medMatch[2].trim(),
      frequency: '',
      route: '',
      duration: '',
    };

    const freqMatch = line.match(
      /(?:once|twice|thrice|1x|2x|3x|bd|tid|qid|qd|hs|sos)\s*(?:daily)?/i,
    );
    if (freqMatch) {
      med.frequency = freqMatch[0];
    }

    fields.medications.push(med);
  }
}

export function extractBloodPressure(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const bpMatch = line.match(/(\d{2,3})\s*[/]\s*(\d{2,3})\s*(?:mmhg)?/i);
  if (bpMatch && !fields.vitals.bp) {
    fields.vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
  }
}

export function extractTemperature(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const tempMatch = line.match(
    /(?:temp|t).?\s*[:-]?\s*(\d+.?\d*)\s*(?:°|c|f)?/i,
  );
  if (tempMatch && !fields.vitals.temp) {
    const val = parseFloat(tempMatch[1]);
    if (val > 35 && val < 105) {
      fields.vitals.temp = tempMatch[1];
    }
  }
}

export function extractPulse(line: string, fields: ParsedMedicalFields): void {
  const pulseMatch = line.match(
    /(?:pulse|hr|heart\s*rate|p).?\s*[:-]?\s*(\d{2,3})/i,
  );
  if (pulseMatch && !fields.vitals.pulse) {
    const val = parseInt(pulseMatch[1]);
    if (val > 40 && val < 200) {
      fields.vitals.pulse = pulseMatch[1];
    }
  }
}

export function extractSpO2(line: string, fields: ParsedMedicalFields): void {
  const spo2Match = line.match(/(?:spo2|sat).?\s*[:-]?\s*(\d{2,3})\s*%/i);
  if (spo2Match && !fields.vitals.spO2) {
    fields.vitals.spO2 = spo2Match[1];
  }
}

export function extractHemoglobin(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (lowerLine.includes('hemoglobin') || lowerLine.includes('hb')) {
    const valueMatch = line.match(/(\d+.?\d*)\s*(?:g\/dl|gm\/dl)?/i);
    if (valueMatch) {
      fields.labValues.hemoglobin = valueMatch[1];
    }
  }
}

export function extractGlucose(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (
    lowerLine.includes('glucose') ||
    lowerLine.includes('blood sugar') ||
    lowerLine.includes('bsl') ||
    lowerLine.includes('rbs') ||
    lowerLine.includes('fbs')
  ) {
    const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
    if (valueMatch) {
      fields.labValues.glucose = valueMatch[1];
    }
  }
}

export function extractCreatinine(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  if (lowerLine.includes('creatinine')) {
    const valueMatch = line.match(/(\d+.?\d*)\s*(?:mg\/dl)?/i);
    if (valueMatch) {
      fields.labValues.creatinine = valueMatch[1];
    }
  }
}
