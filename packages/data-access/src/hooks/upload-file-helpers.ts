/**
 * Pure helpers for the file-upload flow, kept framework-agnostic so the
 * fallback semantics of the upload response are unit-testable without a
 * React Query / rendering harness.
 */

export interface UploadFileResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface UploadFileResponse {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export function createUploadFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export function resolveUploadResult(
  result: UploadFileResponse,
  file: File,
): UploadFileResult {
  return {
    fileUrl: result.fileUrl ?? "",
    fileName: result.fileName ?? file.name,
    fileSize: result.fileSize ?? file.size,
  };
}
