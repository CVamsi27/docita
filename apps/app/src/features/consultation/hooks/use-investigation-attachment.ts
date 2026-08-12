import { useCallback, useState } from "react";
import { useCreateMedicalDocument } from "@workspace/data-access";
import { MAX_FILE_SIZE } from "@workspace/utils";
import { uploadFileViaSession } from "@/lib/api/upload-session";
import { toAbsoluteAppUrl } from "@/lib/utils/app-url";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

interface InvestigationAttachmentResult {
  attachmentUrl: string;
  attachmentName: string;
  attachmentDocumentId?: string;
}

interface UploadArgs {
  file: File;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  investigationName?: string;
}

/**
 * Validate a candidate file before upload. Returns an error message, or null
 * when the file is acceptable. Mirrors the server-side filter in
 * `uploads.controller.ts` (images + PDF, capped at `MAX_FILE_SIZE`).
 */
/** Resolve a stored attachment URL to an absolute, openable link. */
export function resolveAttachmentUrl(fileUrl: string): string {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  return toAbsoluteAppUrl(fileUrl);
}

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    return "Only images (JPEG, PNG, WebP) and PDFs can be attached.";
  }
  if (file.size > MAX_FILE_SIZE) return "File is too large. Attach a file under 10 MB.";
  return null;
}

/**
 * Upload a report/scan for an investigation row during a consultation, then
 * create a linked medical-document so it also surfaces on the patient's
 * Documents page. Reuses the existing upload-session flow
 * (POST /uploads/session → POST /uploads/session/:id) and /medical-documents.
 *
 * Both endpoints require the DOCUMENT_ARCHIVAL feature; callers should gate the
 * attach affordance on that feature before invoking this hook.
 */
export function useInvestigationAttachment() {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const createDocument = useCreateMedicalDocument();

  const upload = useCallback(
    async ({
      file,
      patientId,
      appointmentId,
      doctorId,
      investigationName,
    }: UploadArgs): Promise<InvestigationAttachmentResult> => {
      const uploaded = await uploadFileViaSession(file);

      if (!uploaded.fileUrl) throw new Error("Upload finished but no file URL was returned.");

      const attachmentName = file.name;
      const label = investigationName?.trim()
        ? `Investigation report: ${investigationName.trim()}`
        : "Investigation report";
      let attachmentDocumentId: string | undefined;
      try {
        const doc = await createDocument.mutateAsync({
          type: "OTHER",
          patientId,
          appointmentId,
          doctorId,
          title: label,
          content: {
            source: "consultation-investigation",
            investigationName: investigationName ?? "",
            fileName: attachmentName,
          },
          pdfUrl: uploaded.fileUrl,
        });
        attachmentDocumentId = doc?.id;
      } catch {
        attachmentDocumentId = undefined;
      }

      return {
        attachmentUrl: uploaded.fileUrl,
        attachmentName,
        attachmentDocumentId,
      };
    },
    [createDocument],
  );

  return { upload, uploadingId, setUploadingId };
}
