"use client";

import { useMutation } from "@tanstack/react-query";
import { useDataAccessFetcher } from "../provider/hooks";
import { APIRequestError } from "../lib/errors";
import {
  createUploadFormData,
  resolveUploadResult,
  type UploadFileResponse,
  type UploadFileResult,
} from "./upload-file-helpers";

export type { UploadFileResult } from "./upload-file-helpers";

/**
 * Generic file upload hook for uploading files to the API.
 * Returns the file URL that can be used in subsequent operations.
 */
export const useUploadFile = () => {
  const fetcher = useDataAccessFetcher();
  return useMutation<UploadFileResult, APIRequestError, { file: File; endpoint?: string }>({
    mutationFn: async ({ file, endpoint = "/upload" }) => {
      const result = await fetcher<UploadFileResponse>(
        endpoint,
        {
          method: "POST",
          body: createUploadFormData(file),
          retries: 0,
        },
      );

      return resolveUploadResult(result, file);
    },
  });
};
