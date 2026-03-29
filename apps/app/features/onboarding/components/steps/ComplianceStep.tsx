"use client";

import { UseFormReturn } from "react-hook-form";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, Circle, Loader2, Pencil, Phone, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  DataProcessingAgreementContent,
  PrivacyPolicyContent,
  SLAContent,
} from "@/features/legal";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import { SignaturePad, SignaturePreview } from "@/components/signature-canvas";
import { API_URL } from "@/lib/api-config";
import { getAppUrl } from "@/lib/config";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

function buildJsonHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    "Content-Type": "application/json",
    ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
  };
}

type LegalDocumentType = "sla" | "privacy" | "dpa";
type SignatureMethod = "qr" | "draw";

interface ComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onBack: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onboardingId?: string;
  clinicId?: string;
  uploadSlaSignature?: (file: File) => Promise<string>;
}

// Reusable legal agreement card with scroll-to-enable
function LegalCard({
  id,
  title,
  summary,
  accepted,
  error,
  onOpenDocument,
  onAccept,
  onUnaccept,
}: {
  id: string;
  title: string;
  summary: string;
  accepted: boolean;
  error?: string;
  onOpenDocument: () => void;
  onAccept: () => void;
  onUnaccept: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        accepted ? "border-primary/40 bg-primary/5" : "border-muted",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 shrink-0"
          onClick={accepted ? onUnaccept : onOpenDocument}
          aria-label={accepted ? `Unaccept ${title}` : `Review and accept ${title}`}
        >
          {accepted ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", accepted && "text-primary")}>{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        {!accepted && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={onOpenDocument}
          >
            Review
          </Button>
        )}
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

  useEffect(() => {
    if (!open) {
      setScrolledToBottom(false);
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
    }, 200);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 pr-1"
        >
          {content}
          <div ref={sentinelRef} className="h-px" />
        </div>
        {!scrolledToBottom && (
          <p className="text-xs text-center text-muted-foreground">
            Scroll to the bottom to enable the I Agree button
          </p>
        )}
        <DialogFooter className="pt-2">
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
  uploadSlaSignature,
}: ComplianceStepProps) {
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>(
    onboardingId ? "qr" : "draw",
  );
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType | null>(null);

  // QR tab state
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [qrUploaded, setQrUploaded] = useState(false);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supportPhone = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER;
  const supportMessage =
    "Hi Docita team, I need help with clinic onboarding and pricing for my hospital.";

  const stopQrPolling = useCallback(() => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    setQrPolling(false);
  }, []);

  const startQrPolling = useCallback(
    (onboardingId: string, sessionId: string) => {
      setQrPolling(true);
      qrPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${sessionId}/status`,
            { credentials: "include" },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { uploaded: boolean };
          if (data.uploaded) {
            stopQrPolling();
            setQrUploaded(true);
            complianceForm.setValue("slaSignatureSessionId", sessionId, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }
        } catch {
          // Ignore poll errors — keep trying
        }
      }, 3000);
    },
    [stopQrPolling, complianceForm],
  );

  const handleQrTabActivate = async () => {
    if (!onboardingId || qrSessionId) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await fetch(
        `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
        {
          method: "POST",
          credentials: "include",
          headers: buildJsonHeaders(),
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) throw new Error("Failed to create QR session");
      const data = (await res.json()) as { id: string };
      setQrSessionId(data.id);
      startQrPolling(onboardingId, data.id);
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setQrLoading(false);
    }
  };

  // Auto-activate QR on mount when onboardingId is present
  useEffect(() => {
    if (onboardingId) {
      handleQrTabActivate();
    }
    return () => stopQrPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (value: string) => {
    setSignatureMethod(value as SignatureMethod);
    if (value === "qr" && !qrSessionId) handleQrTabActivate();
    else if (value === "draw") stopQrPolling();
  };

  const uploadOnboardingSlaSignature = async (file: File): Promise<string> => {
    if (!onboardingId) {
      throw new Error("Onboarding ID is required for signature upload");
    }
    const sessionRes = await fetch(
      `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
      {
        method: "POST",
        credentials: "include",
        headers: buildJsonHeaders(),
        body: JSON.stringify({}),
      },
    );
    if (!sessionRes.ok) {
      throw new Error("Failed to create SLA signature upload session");
    }
    const sessionData = (await sessionRes.json()) as { id: string };
    const uploadData = new FormData();
    uploadData.append("file", file);
    const csrfToken = getCsrfToken();
    const uploadRes = await fetch(
      `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${sessionData.id}`,
      {
        method: "POST",
        credentials: "include",
        headers: { ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}) },
        body: uploadData,
      },
    );
    if (!uploadRes.ok) {
      throw new Error("Failed to upload SLA signature");
    }
    return sessionData.id;
  };

  const uploadSignatureFile = async (file: File) => {
    setSignatureUploading(true);
    try {
      const uploader = uploadSlaSignature ?? uploadOnboardingSlaSignature;
      const tokenOrSessionId = await uploader(file);
      complianceForm.setValue("slaSignatureSessionId", tokenOrSessionId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } catch (error) {
      complianceForm.setValue("slaSignatureSessionId", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      throw error;
    } finally {
      setSignatureUploading(false);
    }
  };

  const handleCanvasSignatureSave = async (dataUrl: string) => {
    setDrawnSignatureDataUrl(dataUrl);
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const file = new File([u8arr], "signature.png", { type: mime });
    await uploadSignatureFile(file);
  };

  const legalDocs: {
    key: LegalDocumentType;
    title: string;
    summary: string;
    accepted: boolean;
    fieldKey: "acceptedSLA" | "acceptedPrivacyPolicy" | "acceptedDataProcessing";
  }[] = [
    {
      key: "sla",
      title: "Service Level Agreement",
      summary: "Platform uptime, support timelines, incident response, and governance commitments.",
      accepted: !!complianceForm.watch("acceptedSLA"),
      fieldKey: "acceptedSLA",
    },
    {
      key: "privacy",
      title: "Privacy Policy & Data Consent",
      summary: "How patient data is collected, stored, and processed under DPDP regulations.",
      accepted: !!complianceForm.watch("acceptedPrivacyPolicy"),
      fieldKey: "acceptedPrivacyPolicy",
    },
    {
      key: "dpa",
      title: "Data Processing Agreement",
      summary: "Your obligations as a data fiduciary and our role as a data processor.",
      accepted: !!complianceForm.watch("acceptedDataProcessing"),
      fieldKey: "acceptedDataProcessing",
    },
  ];

  const acceptedCount = legalDocs.filter((d) => d.accepted).length;

  const legalDocumentConfig = activeLegalDoc
    ? activeLegalDoc === "sla"
      ? { title: "Service Level Agreement", description: "Review the SLA terms before accepting.", content: <SLAContent /> }
      : activeLegalDoc === "privacy"
        ? { title: "Privacy Policy & Data Consent", description: "Review privacy and consent terms before accepting.", content: <PrivacyPolicyContent /> }
        : { title: "Data Processing Agreement", description: "Review data processing obligations before accepting.", content: <DataProcessingAgreementContent /> }
    : null;

  const qrUrl =
    qrSessionId && onboardingId
      ? `${getAppUrl()}/upload-signature/onboarding?onboardingId=${onboardingId}&sessionId=${qrSessionId}`
      : null;

  const signatureSessionId = complianceForm.watch("slaSignatureSessionId");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Compliance and Legal</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="step5" onSubmit={onSubmit} noValidate className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Need hand-holding?</p>
              <p className="text-sm text-muted-foreground">
                We support onboarding, reminders, and follow-up over WhatsApp.
                Reach us directly if you want a guided setup or a 3-month trial
                offer.
              </p>
            </div>
            <WhatsAppButton
              phoneNumber={supportPhone}
              message={supportMessage}
              label="Message onboarding team"
              variant="default"
            />
          </div>

          {/* DPDP Compliance */}
          <div className="space-y-3 border p-4 rounded-md">
            <h3 className="font-semibold text-sm">DPDP Compliance Settings</h3>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="requireConsent"
                checked={complianceForm.watch("requireConsent")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue("requireConsent", checked as boolean, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="requireConsent" className="text-sm">
                  Require explicit patient consent for WhatsApp communications (mandatory under DPDP)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  WhatsApp integration is enabled by default. Patient consent is required before sending any messages per DPDP regulations.
                </p>
              </div>
            </div>
          </div>

          {/* SLA Signature */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">SLA Signature</h3>
            <Tabs value={signatureMethod} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  <Phone className="h-3.5 w-3.5 mr-1.5" />
                  Sign via Phone
                </TabsTrigger>
                <TabsTrigger value="draw">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Draw Here
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-4 pt-2">
                {!onboardingId ? (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    QR signing is available once the clinic setup is saved. Use Draw Here to sign immediately.
                  </div>
                ) : qrUploaded ? (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium">Signature received from your phone.</p>
                      <p className="text-xs text-primary/70 mt-0.5">Your signature has been saved successfully.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
                      <div className="space-y-2.5">
                        {[
                          "Open your phone camera",
                          "Scan the QR code below",
                          "Draw your signature on your phone screen",
                          "This page updates automatically",
                        ].map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </span>
                            <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {qrLoading && (
                      <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating QR code...
                      </div>
                    )}
                    {qrError && (
                      <div className="space-y-2">
                        <p className="text-sm text-destructive">{qrError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQrSessionId(null);
                            setQrError(null);
                            handleQrTabActivate();
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Retry
                        </Button>
                      </div>
                    )}
                    {qrUrl && (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                          <QRCodeSVG value={qrUrl} size={180} />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {qrPolling ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Waiting for signature from your phone...
                            </>
                          ) : (
                            <span>Scan the QR code with your phone camera</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard?.writeText(qrUrl);
                          }}
                        >
                          Copy link instead
                        </button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="draw" className="space-y-2">
                {!drawnSignatureDataUrl ? (
                  <SignaturePad onSave={handleCanvasSignatureSave} />
                ) : (
                  <SignaturePreview
                    dataUrl={drawnSignatureDataUrl}
                    onEdit={() => {
                      setDrawnSignatureDataUrl(null);
                      complianceForm.setValue("slaSignatureSessionId", "");
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>

            {signatureUploading && (
              <p className="text-xs text-muted-foreground">Uploading signature...</p>
            )}
            {complianceForm.formState.errors.slaSignatureSessionId && (
              <p className="text-sm text-destructive">
                {complianceForm.formState.errors.slaSignatureSessionId.message}
              </p>
            )}
          </div>

          {/* Legal Agreements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Legal Agreements</h3>
              <span className="text-xs text-muted-foreground">
                {acceptedCount} of {legalDocs.length} accepted
              </span>
            </div>
            <div className="space-y-3">
              {legalDocs.map((doc) => (
                <LegalCard
                  key={doc.key}
                  id={doc.key}
                  title={doc.title}
                  summary={doc.summary}
                  accepted={doc.accepted}
                  error={
                    complianceForm.formState.errors[doc.fieldKey]?.message
                  }
                  onOpenDocument={() => setActiveLegalDoc(doc.key)}
                  onAccept={() =>
                    complianceForm.setValue(doc.fieldKey, true, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
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
          const isReady = checklist.every((c) => c.done) && !signatureUploading;
          const pendingItems = checklist.filter((c) => !c.done);
          return (
            <>
              {pendingItems.length > 0 && !complianceForm.formState.isSubmitting && (
                <div className="w-full rounded-md border border-muted bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Complete before registering:</p>
                  {pendingItems.map((item) => (
                    <p key={item.label} className="text-xs text-muted-foreground flex items-center gap-1.5">
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
                    ? "Creating Clinic..."
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
              complianceForm.setValue("acceptedSLA", true, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            } else if (activeLegalDoc === "privacy") {
              complianceForm.setValue("acceptedPrivacyPolicy", true, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            } else if (activeLegalDoc === "dpa") {
              complianceForm.setValue("acceptedDataProcessing", true, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            }
            setActiveLegalDoc(null);
          }}
        />
      )}
    </Card>
  );
}
