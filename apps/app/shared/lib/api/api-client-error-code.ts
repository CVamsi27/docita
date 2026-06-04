import { isRecord } from "@workspace/utils";
import type { ApiClientError } from "./api-client-error-types";

export function extractErrorCode(error: ApiClientError): string | undefined {
  if (typeof error.code === "string" && error.code.length > 0)
    return error.code;
  const directCode = isRecord(error.data) ? error.data.code : undefined;
  if (typeof directCode === "string") return directCode;
  const nestedError = isRecord(error.data) ? error.data.error : undefined;
  const nestedCode = isRecord(nestedError) ? nestedError.code : undefined;
  return typeof nestedCode === "string" ? nestedCode : undefined;
}
