"use client";

import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { APIRequestError } from "../../lib/errors";
import { useDataAccessFetcher } from "../../provider/hooks";

const SIGNED_URL_PREFIXES = ["https://", "/"];
const SIGNED_URL_REQUIRED_PARAMS = [
  "X-Amz-Signature",
  "X-Amz-Algorithm",
  "X-Amz-Credential",
] as const;

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 60000;

export const enqueuePdfJobResponseSchema = z.object({
  jobId: z.string(),
});

export const pdfJobStatusResponseSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
  pdfUrl: z.string().optional(),
});

function validateAndOpenPdfUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  if (!SIGNED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return false;
  }

  const hasSignatureParams = SIGNED_URL_REQUIRED_PARAMS.every((param) =>
    parsed.searchParams.has(param),
  );
  if (parsed.searchParams.has("X-Amz-Signature") && !hasSignatureParams) {
    return false;
  }

  if (hasSignatureParams) {
    const expiresParam = parsed.searchParams.get("X-Amz-Expires");
    const dateParam = parsed.searchParams.get("X-Amz-Date");
    if (expiresParam && dateParam) {
      const expiresInSeconds = parseInt(expiresParam, 10);
      if (!Number.isNaN(expiresInSeconds)) {
        const dateFormat = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
        const match = dateParam.match(dateFormat);
        const [, year, month, day, hour, minute, second] = match ?? [];
        if (year && month && day && hour && minute && second) {
          const issuedAt = Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10),
          );
          if (Date.now() > issuedAt + expiresInSeconds * 1000) {
            return false;
          }
        }
      }
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/**
 * Polls the async PDF job until completion and opens the resulting URL.
 * Used by prescription/medical-document download flows.
 */
export function usePollPdfJob(
  endpoint: string,
  statusEndpoint: (id: string, jobId: string) => string,
) {
  const fetcher = useDataAccessFetcher();
  return useMutation({
    mutationFn: async (resourceId: string) => {
      const enqueueResponse = await fetcher<unknown>(
        `${endpoint}/${resourceId}?async=true`,
      );
      const { jobId } = enqueuePdfJobResponseSchema.parse(enqueueResponse);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusResponse = await fetcher<unknown>(statusEndpoint(resourceId, jobId));
        const status = pdfJobStatusResponseSchema.parse(statusResponse);

        if (status.status === "COMPLETED" && status.pdfUrl) {
          if (typeof window !== "undefined") {
            validateAndOpenPdfUrl(status.pdfUrl);
          }
          return;
        }

        if (status.status === "FAILED") throw new Error("PDF generation failed");
      }

      throw new Error("PDF generation timed out");
    },
  });
}

export { APIRequestError };
