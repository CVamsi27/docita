import {
  uploadSessionContractResponseSchema,
  uploadSessionCreateContractResponseSchema,
} from "@workspace/types";

import { api } from "@/lib/api/api-client";

/**
 * `UploadSessionCredentials { id, uploadSecret }` and
 * `UploadSessionResponse { id?, status?, fileUrl? }` were hand-written here
 * while `@workspace/types` already exported the contract for both — the same
 * two shapes were then hand-written a second time in
 * `apps/app/src/features/setup/api/onboarding.api.ts`.
 *
 * Every field of the second one was optional, so `{}` satisfied it and a
 * response that stopped carrying `status` would have read as "not uploaded"
 * rather than failing. `use-mobile-upload` branches on `status === "uploaded"`
 * to decide whether to tell the patient their upload succeeded.
 */
function createUploadSession() {
  return api.validate(
    "/uploads/session",
    uploadSessionCreateContractResponseSchema,
    { method: "POST" },
  );
}

export function uploadFileToSession(params: {
  sessionId: string;
  uploadSecret: string;
  file: File;
  suppressGlobalErrorToast?: boolean;
}) {
  const formData = new FormData();
  formData.append("file", params.file);
  return api.validate(
    `/uploads/session/${params.sessionId}`,
    uploadSessionContractResponseSchema,
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

export async function uploadFileViaSession(file: File) {
  const session = await createUploadSession();
  return uploadFileToSession({
    sessionId: session.id,
    uploadSecret: session.uploadSecret,
    file,
  });
}