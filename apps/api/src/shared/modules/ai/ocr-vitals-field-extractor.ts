import type { OcrRawData } from '@workspace/types';
import { toOcrString } from './ocr-field-utils';

export function extractVitals(data: OcrRawData | null | undefined) {
  return {
    bp: data?.vitals?.bp ?? '',
    temp: toOcrString(data?.vitals?.temp),
    pulse: toOcrString(data?.vitals?.pulse),
    respiratoryRate: toOcrString(data?.vitals?.respiratoryRate),
    spO2: toOcrString(data?.vitals?.spO2),
    weight: toOcrString(data?.vitals?.weight),
    height: toOcrString(data?.vitals?.height),
    bmi: toOcrString(data?.vitals?.bmi),
  };
}
