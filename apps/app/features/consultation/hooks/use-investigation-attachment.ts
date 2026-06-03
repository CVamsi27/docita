"use client";

import { useCallback, useState } from "react";
import { MAX_FILE_SIZE } from "@workspace/utils";
import { api, apiFetch } from "@/lib/api/api-client";
import { buildCsrfHeaders } from "@/lib/auth/csrf";
import { toAbsoluteAppUrl } from "@/lib/utils/url";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export interface InvestigationAttachmentResult {
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

interface UploadSessionCreateResponse {
  id: string;
  uploadSecret: string;
}

interface UploadSessionResponse {
  id: string;
  status: string;
  fileUrl?: string | null;
}

interface MedicalDocumentResponse {
  id: string;
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
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return "Only images (JPEG, PNG, WebP) and PDFs can be attached.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Attach a file under 10 MB.";
  }
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

  const upload = useCallback(
    async ({
      file,
      patientId,
      appointmentId,
      doctorId,
      investigationName,
    }: UploadArgs): Promise<InvestigationAttachmentResult> => {
      // 1. Open an upload session to obtain a one-shot secret.
      const session = await apiFetch<UploadSessionCreateResponse>(
        "/uploads/session",
        { method: "POST" },
      );

      // 2. Stream the file to the session (multipart). The browser sets the
      //    multipart boundary, so we must not force a JSON content type here.
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiFetch<UploadSessionResponse>(
        `/uploads/session/${session.id}`,
        {
          method: "POST",
          headers: buildCsrfHeaders({ "X-Upload-Secret": session.uploadSecret }),
          body: formData,
        },
      );

      if (!uploaded.fileUrl) {
        throw new Error("Upload finished but no file URL was returned.");
      }

      const attachmentName = file.name;
      const label = investigationName?.trim()
        ? `Investigation report: ${investigationName.trim()}`
        : "Investigation report";

      // 3. Create a medical-document record so the file shows in Documents.
      let attachmentDocumentId: string | undefined;
      try {
        const doc = await api.post<MedicalDocumentResponse>(
          "/medical-documents",
          {
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
          },
        );
        attachmentDocumentId = doc?.id;
      } catch {
        // The file is already stored and linked to the row; a failed document
        // record should not lose the attachment. Surface a soft warning upstream.
        attachmentDocumentId = undefined;
      }

      return {
        attachmentUrl: uploaded.fileUrl,
        attachmentName,
        attachmentDocumentId,
      };
    },
    [],
  );

  return { upload, uploadingId, setUploadingId };
}
