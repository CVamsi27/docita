import { apiFetch } from "@/lib/api/api-client";

interface UploadSessionCredentials {
  id: string;
  uploadSecret: string;
}

interface UploadSessionResponse {
  id?: string;
  status?: string;
  fileUrl?: string | null;
}

function createUploadSession(): Promise<UploadSessionCredentials> {
  return apiFetch<UploadSessionCredentials>("/uploads/session", {
    method: "POST",
  });
}

export function uploadFileToSession(params: {
  sessionId: string;
  uploadSecret: string;
  file: File;
  suppressGlobalErrorToast?: boolean;
}): Promise<UploadSessionResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  return apiFetch<UploadSessionResponse>(
    `/uploads/session/${params.sessionId}`,
    {
      method: "POST",
      headers: { "X-Upload-Secret": params.uploadSecret },
      body: formData,
      ...(params.suppressGlobalErrorToast !== undefined
        ? { suppressGlobalErrorToast: params.suppressGlobalErrorToast }
        : {}),
    },
  );
}

export async function uploadFileViaSession(
  file: File,
): Promise<UploadSessionResponse> {
  const session = await createUploadSession();
  return uploadFileToSession({
    sessionId: session.id,
    uploadSecret: session.uploadSecret,
    file,
  });
}
