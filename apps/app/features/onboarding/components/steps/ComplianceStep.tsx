"use client";

import { UseFormReturn } from "react-hook-form";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { APIRequestError } from "@workspace/data-access";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import {
  DataProcessingAgreementContent,
  PrivacyPolicyContent,
  SLAContent,
} from "@/features/legal";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import { apiFetch } from "@/lib/api-client";
import { API_URL } from "@/lib/api-config";
import { buildJsonHeaders } from "@/lib/csrf";
import { toAbsoluteAppUrl } from "@/lib/url";
import { PhoneSignatureQrPanel } from "@/features/_shared/components/signature/phone-signature-qr-panel";
import { usePhoneSignatureQrFlow } from "@/features/_shared/hooks/use-phone-signature-qr-flow";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import Image from "next/image";

type LegalDocumentType = "sla" | "privacy" | "dpa";
interface ComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onBack: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onboardingId?: string;
  ensureOnboardingId?: (options?: {
    forceRefresh?: boolean;
  }) => Promise<string>;
  clinicId?: string;
}
interface QrSessionStatusResponse {
  status?: string;
  uploaded?: boolean;
  fileUrl?: string | null;
}

function resolveSignaturePreviewUrl(fileUrl: string): string {
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
    const apiOrigin = new URL(
      API_URL,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    ).origin;
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

// Reusable legal agreement card with scroll-to-enable
function LegalCard({
  index,
  title,
  summary,
  accepted,
  error,
  onOpenDocument,
  onUnaccept,
}: {
  index: number;
  title: string;
  summary: string;
  accepted: boolean;
  error?: string;
  onOpenDocument: () => void;
  onUnaccept: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border p-4 md:p-5 transition-all",
        accepted
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/20",
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div
          className={cn(
            "mt-0.5 shrink-0 rounded-full border p-1.5",
            accepted
              ? "border-primary/40 bg-background/70"
              : "border-muted-foreground/20 bg-background/70",
          )}
        >
          {accepted ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold",
                accepted && "text-primary",
              )}
            >
              {index}. {title}
            </p>
            <Badge
              variant={accepted ? "default" : "outline"}
              className={cn(
                "text-[var(--fs-2xs)] h-5 px-2",
                accepted
                  ? "bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {accepted ? "Accepted" : "Pending review"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {summary}
          </p>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              variant={accepted ? "outline" : "default"}
              onClick={onOpenDocument}
            >
              {accepted ? "Review again" : "Review & accept"}
            </Button>
            {accepted && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                variant="ghost"
                onClick={onUnaccept}
              >
                Mark as pending
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dialog content with scroll-tracking to unlock I Agree button
function LegalDocumentDialog({
  open,
  onClose,
  title,
  description,
  content,
  onAgree,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  content: React.ReactNode;
  onAgree: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollProgress = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(100);
      return;
    }
    setScrollProgress(
      Math.min(100, Math.round((container.scrollTop / maxScroll) * 100)),
    );
  }, []);

  useEffect(() => {
    if (!open) {
      setScrolledToBottom(false);
      setScrollProgress(0);
      return;
    }
    // Wait for dialog animation to complete before observing
    let observer: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      const container = scrollRef.current;
      const sentinel = sentinelRef.current;
      if (!container || !sentinel) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setScrolledToBottom(true);
        },
        { root: container, threshold: 0 },
      );
      observer.observe(sentinel);
      updateScrollProgress();
    }, 200);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [open, updateScrollProgress]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b bg-muted/25 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-base md:text-lg">
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="h-6 px-2.5 text-[var(--fs-2xs)]"
            >
              Required
            </Badge>
          </div>
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[var(--fs-2xs)] text-muted-foreground">
              <span>Read progress</span>
              <span>{scrollProgress}%</span>
            </div>
            <Progress value={scrollProgress} className="h-1.5" />
          </div>
        </DialogHeader>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 px-6 py-5"
          onScroll={updateScrollProgress}
        >
          {content}
          <div ref={sentinelRef} className="h-px" />
        </div>
        {!scrolledToBottom && (
          <div className="px-6 pb-1">
            <p className="text-xs text-center text-muted-foreground">
              Scroll to the bottom to enable the I Agree button
            </p>
          </div>
        )}
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onAgree} disabled={!scrolledToBottom}>
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComplianceStep({
  complianceForm,
  onBack,
  onSubmit,
  onboardingId,
  ensureOnboardingId,
}: ComplianceStepProps) {
  const [activeLegalDoc, setActiveLegalDoc] =
    useState<LegalDocumentType | null>(null);
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
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const status = data.status?.toLowerCase();
      return Boolean(
        data.uploaded ||
        data.fileUrl ||
        status === "uploaded" ||
        status === "completed",
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
      throw new Error(
        "We could not create the signature link right now. Please try again.",
      );
    }

    let sessionData: { id: string; uploadSecret: string } | null = null;
    let errMessage =
      "We could not create the signature link right now. Please try again.";

    try {
      sessionData = await createSession(activeOnboardingId);
    } catch (error) {
      if (isStaleOnboardingSessionError(error) && ensureOnboardingId) {
        const refreshedOnboardingId = await ensureOnboardingId({
          forceRefresh: true,
        });
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
  const refreshQrStatus = qrFlow.refreshStatus;
  const copyQrLink = qrFlow.copyLink;

  const resolveOnboardingId = useCallback(async (): Promise<string | null> => {
    if (onboardingId) {
      return onboardingId;
    }
    if (ensureOnboardingId) {
      return await ensureOnboardingId();
    }
    return null;
  }, [ensureOnboardingId, onboardingId]);

  const fetchSignaturePreview = useCallback(
    async (activeOnboardingId: string, sessionId: string) => {
      setSignaturePreviewLoading(true);
      try {
        const data = await apiFetch<QrSessionStatusResponse>(
          `/onboarding/${activeOnboardingId}/sla-signature-session/${sessionId}/status?ts=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
          },
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

    // If we already have a file URL, don't refetch unless the session id changes.
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
  }, [
    fetchSignaturePreview,
    hasOnboardingContext,
    resolveOnboardingId,
    signatureFileUrl,
    signatureSessionId,
  ]);

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
      showUserFacingErrorToast(
        "We could not restart the signature link. Please try again.",
      );
    }
  }, [complianceForm, qrFlow, setSignatureFileUrl]);

  const handleManualStatusRefresh = useCallback(async () => {
    try {
      const isUploaded = await refreshQrStatus();
      if (isUploaded) {
        toast.success("Signature synced");
      } else {
        toast.message("We have not received the signature yet");
      }
    } catch {
      showUserFacingErrorToast(
        "We could not refresh the signature status. Please try again.",
      );
    }
  }, [refreshQrStatus]);

  const handleCopyQrLink = useCallback(async () => {
    try {
      const copied = await copyQrLink();
      if (copied) {
        toast.success("Link copied");
      } else {
        showUserFacingErrorToast(
          "We could not copy this link. Please try again.",
        );
      }
    } catch {
      showUserFacingErrorToast(
        "We could not copy this link. Please try again.",
      );
    }
  }, [copyQrLink]);

  const legalDocs: {
    key: LegalDocumentType;
    title: string;
    summary: string;
    accepted: boolean;
    fieldKey:
      | "acceptedSLA"
      | "acceptedPrivacyPolicy"
      | "acceptedDataProcessing";
  }[] = [
    {
      key: "sla",
      title: "Service Level Agreement",
      summary:
        "Platform uptime, support timelines, incident response, and governance commitments",
      accepted: !!complianceForm.watch("acceptedSLA"),
      fieldKey: "acceptedSLA",
    },
    {
      key: "privacy",
      title: "Privacy Policy & Data Consent",
      summary:
        "How patient data is collected, stored, and processed under DPDP regulations",
      accepted: !!complianceForm.watch("acceptedPrivacyPolicy"),
      fieldKey: "acceptedPrivacyPolicy",
    },
    {
      key: "dpa",
      title: "Data Processing Agreement",
      summary:
        "Your obligations as a data fiduciary and our role as a data processor",
      accepted: !!complianceForm.watch("acceptedDataProcessing"),
      fieldKey: "acceptedDataProcessing",
    },
  ];

  const acceptedCount = legalDocs.filter((d) => d.accepted).length;

  const legalDocumentConfig = activeLegalDoc
    ? activeLegalDoc === "sla"
      ? {
          title: "Service Level Agreement",
          description: "Review the SLA terms before accepting",
          content: <SLAContent />,
        }
      : activeLegalDoc === "privacy"
        ? {
            title: "Privacy Policy & Data Consent",
            description: "Review privacy and consent terms before accepting",
            content: <PrivacyPolicyContent />,
          }
        : {
            title: "Data Processing Agreement",
            description: "Review data processing obligations before accepting",
            content: <DataProcessingAgreementContent />,
          }
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Compliance and Legal</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="step5" onSubmit={onSubmit} noValidate className="space-y-6">
          {/* DPDP Compliance */}
          <div className="space-y-3 border p-4 rounded-md">
            <h3 className="font-semibold text-sm">DPDP Compliance Settings</h3>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="requireConsent"
                checked={complianceForm.watch("requireConsent")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue(
                    "requireConsent",
                    checked as boolean,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="requireConsent" className="text-sm">
                  Require explicit patient consent for WhatsApp communications
                  (mandatory under DPDP)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  WhatsApp integration is enabled by default. Patient consent is
                  required before sending any messages per DPDP regulations.
                </p>
              </div>
            </div>
          </div>

          {/* SLA Signature */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">SLA Signature</h3>
            <PhoneSignatureQrPanel
              loading={qrFlow.isLoading}
              uploaded={qrFlow.isUploaded}
              polling={qrFlow.isPolling}
              error={qrFlow.error}
              qrUrl={qrFlow.session?.qrUrl ?? null}
              onRetry={() => {
                void qrFlow.retrySession();
              }}
              onRefreshStatus={handleManualStatusRefresh}
              onCopyLink={handleCopyQrLink}
              missingContextMessage={
                !hasOnboardingContext
                  ? "Missing onboarding session ID for QR signature. Go back to Step 3 and continue once to re-initialize."
                  : undefined
              }
              successTitle="Signature received from your phone"
              successDescription="Your signature has been saved successfully"
            />
            {qrFlow.isUploaded ? (
              <div className="ui-card-surface space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="ui-section-title text-[var(--fs-sm)]">
                    Signature preview
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      void handleResign();
                    }}
                  >
                    Edit / Re-sign
                  </Button>
                </div>
                {signaturePreviewLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Loading signature preview…
                  </p>
                ) : signatureFileUrl && !signaturePreviewFailed ? (
                  <div className="rounded-md border bg-background p-3">
                    <Image
                      src={signatureFileUrl}
                      alt="SLA signature preview"
                      width={700}
                      height={260}
                      className="h-auto w-full max-w-full"
                      unoptimized
                      onError={() => {
                        setSignaturePreviewFailed(true);
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    We received your signature, but the preview is not available
                    yet. You can continue, or re-sync to try again.
                  </p>
                )}
              </div>
            ) : null}
            {complianceForm.formState.errors.slaSignatureSessionId && (
              <p className="text-sm text-destructive">
                {complianceForm.formState.errors.slaSignatureSessionId.message}
              </p>
            )}
          </div>

          {/* Legal Agreements */}
          <div className="space-y-4 rounded-lg border p-4 md:p-5 bg-card">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Legal Agreements</h3>
                </div>
                <Badge
                  variant={
                    acceptedCount === legalDocs.length ? "default" : "secondary"
                  }
                  className="h-6 px-2.5"
                >
                  {acceptedCount}/{legalDocs.length} accepted
                </Badge>
              </div>
              <Progress
                value={(acceptedCount / legalDocs.length) * 100}
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground">
                Review each agreement and accept all documents to continue
                registration.
              </p>
            </div>
            <div className="space-y-3">
              {legalDocs.map((doc, index) => (
                <LegalCard
                  key={doc.key}
                  index={index + 1}
                  title={doc.title}
                  summary={doc.summary}
                  accepted={doc.accepted}
                  error={complianceForm.formState.errors[doc.fieldKey]?.message}
                  onOpenDocument={() => setActiveLegalDoc(doc.key)}
                  onUnaccept={() =>
                    complianceForm.setValue(doc.fieldKey, false, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                />
              ))}
            </div>
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        {(() => {
          const checklist = [
            { label: "SLA signature uploaded", done: !!signatureSessionId },
            ...legalDocs.map((d) => ({
              label: `${d.title} accepted`,
              done: d.accepted,
            })),
          ];
          const isReady = checklist.every((c) => c.done);
          const pendingItems = checklist.filter((c) => !c.done);
          return (
            <>
              {pendingItems.length > 0 &&
                !complianceForm.formState.isSubmitting && (
                  <div className="w-full rounded-md border border-muted bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Complete before registering:
                    </p>
                    {pendingItems.map((item) => (
                      <p
                        key={item.label}
                        className="text-xs text-muted-foreground flex items-center gap-1.5"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                        {item.label}
                      </p>
                    ))}
                  </div>
                )}
              <div className="flex w-full justify-between gap-4">
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  form="step5"
                  type="submit"
                  disabled={complianceForm.formState.isSubmitting || !isReady}
                >
                  {complianceForm.formState.isSubmitting
                    ? "Creating Clinic…"
                    : "Complete Registration"}
                </Button>
              </div>
            </>
          );
        })()}
      </CardFooter>

      {legalDocumentConfig && (
        <LegalDocumentDialog
          open={Boolean(activeLegalDoc)}
          onClose={() => setActiveLegalDoc(null)}
          title={legalDocumentConfig.title}
          description={legalDocumentConfig.description}
          content={legalDocumentConfig.content}
          onAgree={() => {
            if (activeLegalDoc === "sla") {
              complianceForm.setValue("acceptedSLA", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            } else if (activeLegalDoc === "privacy") {
              complianceForm.setValue("acceptedPrivacyPolicy", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            } else if (activeLegalDoc === "dpa") {
              complianceForm.setValue("acceptedDataProcessing", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }
            setActiveLegalDoc(null);
          }}
        />
      )}
    </Card>
  );
}
