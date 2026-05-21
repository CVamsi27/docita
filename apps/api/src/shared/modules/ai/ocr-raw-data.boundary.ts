import type { OcrRawData } from '@workspace/types';
import { isRecord } from '@workspace/utils';

/** check-as-cast-density: allow-file — OpenAI JSON payload shape is validated field-by-field in `normalizeOcrFields`. */
export function coerceOcrRawData(parsed: unknown): OcrRawData | null {
  return isRecord(parsed) ? (parsed as OcrRawData) : null;
}
