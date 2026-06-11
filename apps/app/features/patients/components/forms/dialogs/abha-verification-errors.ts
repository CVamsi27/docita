import { APIRequestError } from "@workspace/data-access";
import type { AbhaVerificationResult } from "@workspace/types";
import type { AbhaVerificationUiState } from "./abha-verification-field";

function readNestedErrorCode(error: APIRequestError): string | undefined {
  const message = error.data?.message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return error.code;
  }
  const code = (message as Record<string, unknown>).code;
  return typeof code === "string" ? code : error.code;
}

export function getAbhaVerificationErrorState(
  error: unknown,
): AbhaVerificationUiState {
  if (error instanceof APIRequestError) {
    const code = readNestedErrorCode(error);
    if (error.status === 503 || code === "ABDM_NOT_CONFIGURED") {
      return {
        kind: "not-configured",
        message:
          "ABDM is not configured for this environment. The ABHA value was saved but not verified.",
      };
    }
  }
  return {
    kind: "failed",
    message: "ABHA could not be verified. Check the value and try again.",
  };
}

export function getAbhaVerificationResultState(
  result: AbhaVerificationResult,
): AbhaVerificationUiState {
  if (!result.verified) {
    if (result.error === "ABDM_NOT_CONFIGURED") {
      return {
        kind: "not-configured",
        message:
          "ABDM is not configured for this environment. The ABHA value was saved but not verified.",
      };
    }
    return {
      kind: "failed",
      message: "ABHA could not be verified. Check the value and try again.",
    };
  }

  return {
    kind: "verified",
    message: "ABHA verified successfully",
    detail: result.kycName
      ? `ABDM KYC name: ${result.kycName}`
      : "The ABHA identity is linked to this patient.",
  };
}
