import { APIRequestError } from "@workspace/data-access";
import { getAppApiUrl } from "@/lib/api/api-config";
import { fetchSlaSignatureSessionStatus } from "@/lib/api/sla-signature-session";

export type LegalDocumentType = "sla" | "privacy" | "dpa";

export function resolveSignaturePreviewUrl(fileUrl: string): string {
  const trimmed = fileUrl.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    const apiOrigin = new URL(getAppApiUrl()).origin;
    return `${apiOrigin}${trimmed}`;
  }

  return trimmed;
}

export function isStaleOnboardingSessionError(error: unknown): boolean {
  if (!(error instanceof APIRequestError)) {
    return false;
  }
  if (error.status !== 400 && error.status !== 404) return false;
  return /onboarding session not found|expired/i.test(error.message);
}

export type LegalDocConfig = {
  key: LegalDocumentType;
  title: string;
  summary: string;
  fieldKey: "acceptedSLA" | "acceptedPrivacyPolicy" | "acceptedDataProcessing";
};

export const LEGAL_DOCS_CONFIG: LegalDocConfig[] = [
  {
    key: "sla",
    title: "Service Level Agreement",
    summary:
      "Platform uptime, support timelines, incident response, and governance commitments",
    fieldKey: "acceptedSLA" as const,
  },
  {
    key: "privacy",
    title: "Privacy Policy & Data Consent",
    summary:
      "How patient data is collected, stored, and processed under DPDP regulations",
    fieldKey: "acceptedPrivacyPolicy" as const,
  },
  {
    key: "dpa",
    title: "Data Processing Agreement",
    summary:
      "Your obligations in the data fiduciary role and our role in the data processor role",
    fieldKey: "acceptedDataProcessing" as const,
  },
];

export function buildSignatureUploadRedirectUrl(
  onboardingId: string,
  sessionId: string,
  uploadSecret: string,
): string {
  return `/upload-signature/onboarding?onboardingId=${encodeURIComponent(onboardingId)}&sessionId=${encodeURIComponent(sessionId)}&uploadSecret=${encodeURIComponent(uploadSecret)}`;
}

export async function fetchQrSessionStatus(
  activeOnboardingId: string,
  sessionId: string,
): Promise<boolean> {
  const data = await fetchSlaSignatureSessionStatus(
    activeOnboardingId,
    sessionId,
  );
  const status = data.status?.toLowerCase();
  return Boolean(
    data.uploaded || data.fileUrl || status === "uploaded" || status === "completed",
  );
}
