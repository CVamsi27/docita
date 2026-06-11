import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  createSlaSignatureSession,
  fetchSlaSignatureSessionStatus,
} from "@/features/onboarding/api/onboarding.api";
import { toAbsoluteAppUrl } from "@/lib/utils/app-url";
import { usePhoneSignatureQrFlow } from "@/hooks/use-phone-signature-qr-flow";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import {
  isStaleOnboardingSessionError,
  resolveSignaturePreviewUrl,
  fetchQrSessionStatus,
  buildSignatureUploadRedirectUrl,
  LEGAL_DOCS_CONFIG,
  type LegalDocumentType,
} from "./compliance-step-helpers";

export interface UseComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onboardingId?: string;
  ensureOnboardingId?: (options?: { forceRefresh?: boolean }) => Promise<string>;
}

function useSignaturePreview({
  hasOnboardingContext,
  signatureSessionId,
  resolveOnboardingId,
}: {
  hasOnboardingContext: boolean;
  signatureSessionId: string;
  resolveOnboardingId: () => Promise<string | null>;
}) {
  const [signatureFileUrl, setSignatureFileUrl] = useState<string | null>(null);
  const [signaturePreviewFailed, setSignaturePreviewFailed] = useState(false);
  const [signaturePreviewLoading, setSignaturePreviewLoading] = useState(false);

  const fetchSignaturePreview = useCallback(async (activeOnboardingId: string, sessionId: string) => {
    setSignaturePreviewLoading(true);
    try {
      const data = await fetchSlaSignatureSessionStatus(activeOnboardingId, sessionId);
      setSignatureFileUrl(data.fileUrl ? resolveSignaturePreviewUrl(data.fileUrl) : null);
      setSignaturePreviewFailed(false);
    } catch {
      setSignatureFileUrl(null);
      setSignaturePreviewFailed(false);
    } finally {
      setSignaturePreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasOnboardingContext) return;
    if (!signatureSessionId) { setSignatureFileUrl(null); setSignaturePreviewFailed(false); return; }
    if (signatureFileUrl) return;
    let cancelled = false;
    void (async () => {
      const activeOnboardingId = await resolveOnboardingId();
      if (!activeOnboardingId || cancelled) return;
      await fetchSignaturePreview(activeOnboardingId, signatureSessionId);
    })();
    return () => { cancelled = true; };
  }, [fetchSignaturePreview, hasOnboardingContext, resolveOnboardingId, signatureFileUrl, signatureSessionId]);

  return { signatureFileUrl, setSignatureFileUrl, signaturePreviewFailed, setSignaturePreviewFailed, signaturePreviewLoading };
}

function useQrHandlers({ qrFlow, complianceForm, setSignatureFileUrl, setSignaturePreviewFailed }: {
  qrFlow: ReturnType<typeof usePhoneSignatureQrFlow>;
  complianceForm: UseFormReturn<ComplianceSettings>;
  setSignatureFileUrl: (v: string | null) => void;
  setSignaturePreviewFailed: (v: boolean) => void;
}) {
  const handleResign = useCallback(async () => {
    setSignatureFileUrl(null);
    setSignaturePreviewFailed(false);
    complianceForm.setValue("slaSignatureSessionId", "", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    try { await qrFlow.retrySession(); }
    catch { showUserFacingErrorToast("We could not restart the signature link. Please try again."); }
  }, [complianceForm, qrFlow, setSignatureFileUrl, setSignaturePreviewFailed]);

  const handleManualStatusRefresh = useCallback(async () => {
    try {
      const isUploaded = await qrFlow.refreshStatus();
      if (isUploaded) { toast.success("Signature synced"); } else { toast.message("We have not received the signature yet"); }
    } catch { showUserFacingErrorToast("We could not refresh the signature status. Please try again."); }
  }, [qrFlow]);

  const handleCopyQrLink = useCallback(async () => {
    try {
      const copied = await qrFlow.copyLink();
      if (copied) { toast.success("Link copied"); } else { showUserFacingErrorToast("We could not copy this link. Please try again."); }
    } catch { showUserFacingErrorToast("We could not copy this link. Please try again."); }
  }, [qrFlow]);

  return { handleResign, handleManualStatusRefresh, handleCopyQrLink };
}

export function useComplianceStep({ complianceForm, onboardingId, ensureOnboardingId }: UseComplianceStepProps) {
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType | null>(null);
  const signatureSessionId = complianceForm.watch("slaSignatureSessionId");
  const hasOnboardingContext = Boolean(onboardingId || ensureOnboardingId);

  const createQrSession = useCallback(async () => {
    let activeOnboardingId = ensureOnboardingId ? await ensureOnboardingId() : (onboardingId ?? null);
    if (!activeOnboardingId) throw new Error("We could not create the signature link right now. Please try again.");
    let sessionData: { id: string; uploadSecret: string } | null = null;
    try {
      sessionData = await createSlaSignatureSession(activeOnboardingId);
    } catch (error) {
      if (isStaleOnboardingSessionError(error) && ensureOnboardingId) {
        const refreshed = await ensureOnboardingId({ forceRefresh: true });
        try {
          sessionData = await createSlaSignatureSession(refreshed);
          activeOnboardingId = refreshed;
        } catch {
          /* fall through to null-check below */
        }
      }
    }
    if (!sessionData) throw new Error("We could not create the signature link right now. Please try again.");
    return {
      sessionId: sessionData.id,
      contextId: activeOnboardingId,
      qrUrl: toAbsoluteAppUrl(buildSignatureUploadRedirectUrl(activeOnboardingId, sessionData.id, sessionData.uploadSecret)),
    };
  }, [ensureOnboardingId, onboardingId]);

  const checkQrUploaded = useCallback(async (session: { sessionId: string; contextId?: string }) => {
    if (!session.contextId) return false;
    return fetchQrSessionStatus(session.contextId, session.sessionId);
  }, []);

  const qrFlow = usePhoneSignatureQrFlow({
    createSession: createQrSession,
    checkUploaded: checkQrUploaded,
    onUploaded: (session) => { complianceForm.setValue("slaSignatureSessionId", session.sessionId, { shouldDirty: true, shouldTouch: true, shouldValidate: true }); },
    persistenceKey: "docita_onboarding_sla_qr_session",
    autoStart: hasOnboardingContext && !signatureSessionId,
    initialUploaded: Boolean(signatureSessionId),
  });

  const resolveOnboardingId = useCallback(async (): Promise<string | null> => {
    if (onboardingId) return onboardingId;
    if (ensureOnboardingId) return ensureOnboardingId();
    return null;
  }, [ensureOnboardingId, onboardingId]);

  const { signatureFileUrl, setSignatureFileUrl, signaturePreviewFailed, setSignaturePreviewFailed, signaturePreviewLoading } =
    useSignaturePreview({ hasOnboardingContext, signatureSessionId, resolveOnboardingId });

  const { handleResign, handleManualStatusRefresh, handleCopyQrLink } =
    useQrHandlers({ qrFlow, complianceForm, setSignatureFileUrl, setSignaturePreviewFailed });

  const legalDocs = LEGAL_DOCS_CONFIG.map((doc) => ({ ...doc, accepted: !!complianceForm.watch(doc.fieldKey) }));

  return {
    activeLegalDoc, setActiveLegalDoc, signatureSessionId, hasOnboardingContext,
    signatureFileUrl, signaturePreviewFailed, setSignaturePreviewFailed, signaturePreviewLoading,
    qrFlow, handleResign, handleManualStatusRefresh, handleCopyQrLink,
    legalDocs, acceptedCount: legalDocs.filter((d) => d.accepted).length,
  };
}
