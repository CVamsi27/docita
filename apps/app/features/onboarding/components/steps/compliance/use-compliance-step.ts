import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { APIRequestError } from "@workspace/data-access";
import { apiFetch } from "@/lib/api/api-client";
import { getAppApiUrl } from "@/lib/api/api-config";
import { buildJsonHeaders } from "@/lib/auth/csrf";
import { toAbsoluteAppUrl } from "@/lib/utils/url";
import { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

export type LegalDocumentType = "sla" | "privacy" | "dpa";

interface QrSessionStatusResponse {
  status?: string;
  uploaded?: boolean;
  fileUrl?: string | null;
}

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

function isStaleOnboardingSessionError(error: unknown): boolean {
  if (!(error instanceof APIRequestError)) {
    return false;
  }
  if (error.status !== 400 && error.status !== 404) {
    return false;
  }
  return /onboarding session not found|expired/i.test(error.message);
}

export interface UseComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onboardingId?: string;
  ensureOnboardingId?: (options?: { forceRefresh?: boolean }) => Promise<string>;
}

export function useComplianceStep({
  complianceForm,
  onboardingId,
  ensureOnboardingId,
}: UseComplianceStepProps) {
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType | null>(null);
  const signatureSessionId = complianceForm.watch("slaSignatureSessionId");
  const hasSignatureSession = Boolean(signatureSessionId);
  const hasOnboardingContext = Boolean(onboardingId || ensureOnboardingId);
  const [signatureFileUrl, setSignatureFileUrl] = useState<string | null>(null);
  const [signaturePreviewFailed, setSignaturePreviewFailed] = useState(false);
  const [signaturePreviewLoading, setSignaturePreviewLoading] = useState(false);

  const fetchQrSessionStatus = useCallback(
    async (activeOnboardingId: string, sessionId: string): Promise<boolean> => {
      const data = await apiFetch<QrSessionStatusResponse>(
        `/onboarding/${activeOnboardingId}/sla-signature-session/${sessionId}/status?ts=${Date.now()}`,
        { method: "GET", cache: "no-store" },
      );
      const status = data.status?.toLowerCase();
      return Boolean(
        data.uploaded || data.fileUrl || status === "uploaded" || status === "completed",
      );
    },
    [],
  );

  const createQrSession = useCallback(async () => {
    const createSession = async (resolvedOnboardingId: string) => {
      return await apiFetch<{ id: string; uploadSecret: string }>(
        `/onboarding/${resolvedOnboardingId}/sla-signature-session`,
        {
          method: "POST",
          headers: buildJsonHeaders(),
          body: JSON.stringify({}),
        },
      );
    };

    let activeOnboardingId: string | null = null;
    if (ensureOnboardingId) {
      activeOnboardingId = await ensureOnboardingId();
    } else {
      activeOnboardingId = onboardingId ?? null;
    }

    if (!activeOnboardingId) {
      throw new Error("We could not create the signature link right now. Please try again.");
    }

    let sessionData: { id: string; uploadSecret: string } | null = null;
    let errMessage = "We could not create the signature link right now. Please try again.";

    try {
      sessionData = await createSession(activeOnboardingId);
    } catch (error) {
      if (isStaleOnboardingSessionError(error) && ensureOnboardingId) {
        const refreshedOnboardingId = await ensureOnboardingId({ forceRefresh: true });
        try {
          sessionData = await createSession(refreshedOnboardingId);
          activeOnboardingId = refreshedOnboardingId;
        } catch (retryError) {
          errMessage =
            retryError instanceof Error
              ? "We could not create the signature link right now. Please try again."
              : errMessage;
        }
      }
    }

    if (!sessionData) {
      throw new Error(errMessage);
    }

    return {
      sessionId: sessionData.id,
      contextId: activeOnboardingId,
      qrUrl: toAbsoluteAppUrl(
        `/upload-signature/onboarding?onboardingId=${encodeURIComponent(activeOnboardingId)}&sessionId=${encodeURIComponent(sessionData.id)}&uploadSecret=${encodeURIComponent(sessionData.uploadSecret)}`,
      ),
    };
  }, [ensureOnboardingId, onboardingId]);

  const checkQrUploaded = useCallback(
    async (session: { sessionId: string; contextId?: string }) => {
      if (!session.contextId) return false;
      return fetchQrSessionStatus(session.contextId, session.sessionId);
    },
    [fetchQrSessionStatus],
  );

  const qrFlow = usePhoneSignatureQrFlow({
    createSession: createQrSession,
    checkUploaded: checkQrUploaded,
    onUploaded: (session) => {
      complianceForm.setValue("slaSignatureSessionId", session.sessionId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    persistenceKey: "docita_onboarding_sla_qr_session",
    autoStart: hasOnboardingContext && !hasSignatureSession,
    initialUploaded: hasSignatureSession,
  });

  const resolveOnboardingId = useCallback(async (): Promise<string | null> => {
    if (onboardingId) return onboardingId;
    if (ensureOnboardingId) return await ensureOnboardingId();
    return null;
  }, [ensureOnboardingId, onboardingId]);

  const fetchSignaturePreview = useCallback(
    async (activeOnboardingId: string, sessionId: string) => {
      setSignaturePreviewLoading(true);
      try {
        const data = await apiFetch<QrSessionStatusResponse>(
          `/onboarding/${activeOnboardingId}/sla-signature-session/${sessionId}/status?ts=${Date.now()}`,
          { method: "GET", cache: "no-store" },
        );
        if (data.fileUrl) {
          setSignatureFileUrl(resolveSignaturePreviewUrl(data.fileUrl));
          setSignaturePreviewFailed(false);
        } else {
          setSignatureFileUrl(null);
          setSignaturePreviewFailed(false);
        }
      } catch {
        setSignatureFileUrl(null);
        setSignaturePreviewFailed(false);
      } finally {
        setSignaturePreviewLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasOnboardingContext) return;
    if (!signatureSessionId) {
      setSignatureFileUrl(null);
      setSignaturePreviewFailed(false);
      return;
    }
    if (signatureFileUrl) return;

    let cancelled = false;
    const run = async () => {
      const activeOnboardingId = await resolveOnboardingId();
      if (!activeOnboardingId || cancelled) return;
      await fetchSignaturePreview(activeOnboardingId, signatureSessionId);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchSignaturePreview, hasOnboardingContext, resolveOnboardingId, signatureFileUrl, signatureSessionId]);

  const handleResign = useCallback(async () => {
    setSignatureFileUrl(null);
    setSignaturePreviewFailed(false);
    complianceForm.setValue("slaSignatureSessionId", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    try {
      await qrFlow.retrySession();
    } catch {
      showUserFacingErrorToast("We could not restart the signature link. Please try again.");
    }
  }, [complianceForm, qrFlow]);

  const handleManualStatusRefresh = useCallback(async () => {
    try {
      const isUploaded = await qrFlow.refreshStatus();
      if (isUploaded) {
        toast.success("Signature synced");
      } else {
        toast.message("We have not received the signature yet");
      }
    } catch {
      showUserFacingErrorToast("We could not refresh the signature status. Please try again.");
    }
  }, [qrFlow]);

  const handleCopyQrLink = useCallback(async () => {
    try {
      const copied = await qrFlow.copyLink();
      if (copied) {
        toast.success("Link copied");
      } else {
        showUserFacingErrorToast("We could not copy this link. Please try again.");
      }
    } catch {
      showUserFacingErrorToast("We could not copy this link. Please try again.");
    }
  }, [qrFlow]);

  const legalDocs: Array<{
    key: LegalDocumentType;
    title: string;
    summary: string;
    accepted: boolean;
    fieldKey: "acceptedSLA" | "acceptedPrivacyPolicy" | "acceptedDataProcessing";
  }> = [
    {
      key: "sla",
      title: "Service Level Agreement",
      summary: "Platform uptime, support timelines, incident response, and governance commitments",
      accepted: !!complianceForm.watch("acceptedSLA"),
      fieldKey: "acceptedSLA" as const,
    },
    {
      key: "privacy",
      title: "Privacy Policy & Data Consent",
      summary: "How patient data is collected, stored, and processed under DPDP regulations",
      accepted: !!complianceForm.watch("acceptedPrivacyPolicy"),
      fieldKey: "acceptedPrivacyPolicy" as const,
    },
    {
      key: "dpa",
      title: "Data Processing Agreement",
      summary:
        "Your obligations in the data fiduciary role and our role in the data processor role",
      accepted: !!complianceForm.watch("acceptedDataProcessing"),
      fieldKey: "acceptedDataProcessing" as const,
    },
  ];

  const acceptedCount = legalDocs.filter((d) => d.accepted).length;

  return {
    activeLegalDoc,
    setActiveLegalDoc,
    signatureSessionId,
    hasOnboardingContext,
    signatureFileUrl,
    setSignaturePreviewFailed,
    signaturePreviewFailed,
    signaturePreviewLoading,
    qrFlow,
    handleResign,
    handleManualStatusRefresh,
    handleCopyQrLink,
    legalDocs,
    acceptedCount,
  };
}
