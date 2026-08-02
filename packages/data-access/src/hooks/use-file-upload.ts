"use client";

import { useMutation } from "@tanstack/react-query";
import { useDataAccessFetcher } from "../provider/hooks";
import { APIRequestError } from "../lib/errors";

export interface UploadFileResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Generic file upload hook for uploading files to the API.
 * Returns the file URL that can be used in subsequent operations.
 */
export const useUploadFile = () => {
  const fetcher = useDataAccessFetcher();
  return useMutation<UploadFileResult, APIRequestError, { file: File; endpoint?: string }>({
    mutationFn: async ({ file, endpoint = "/upload" }) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const result = await fetcher<{ fileUrl?: string; fileName?: string; fileSize?: number }>(
        endpoint,
        {
          method: "POST",
          body: formData,
          retries: 0,
        },
      );
      
      return {
        fileUrl: result.fileUrl ?? "",
        fileName: result.fileName ?? file.name,
        fileSize: result.fileSize ?? file.size,
      };
    },
  });
};
