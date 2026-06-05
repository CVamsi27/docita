import type { OcrRawData } from '@workspace/types';

export function extractLabValues(data: OcrRawData | null | undefined) {
  return {
    hemoglobin: data?.labValues?.hemoglobin ?? '',
    creatinine: data?.labValues?.creatinine ?? '',
    glucose: data?.labValues?.glucose ?? '',
    ...(data?.labValues ?? {}),
  };
}
