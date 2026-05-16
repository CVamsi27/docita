"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
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
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import {
  DataProcessingAgreementContent,
  PrivacyPolicyContent,
  SLAContent,
} from "@/features/legal";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import type { LegalDocumentType } from "./use-compliance-step";

interface LegalDocEntry {
  key: LegalDocumentType;
  title: string;
  summary: string;
  accepted: boolean;
  fieldKey: "acceptedSLA" | "acceptedPrivacyPolicy" | "acceptedDataProcessing";
}

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
            <p className={cn("text-sm font-semibold", accepted && "text-primary")}>
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
              <DialogTitle className="text-base md:text-lg">{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <Badge variant="outline" className="h-6 px-2.5 text-[var(--fs-2xs)]">
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

interface CompliancePoliciesSectionProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  activeLegalDoc: LegalDocumentType | null;
  setActiveLegalDoc: (doc: LegalDocumentType | null) => void;
  legalDocs: LegalDocEntry[];
  acceptedCount: number;
}

export function CompliancePoliciesSection({
  complianceForm,
  activeLegalDoc,
  setActiveLegalDoc,
  legalDocs,
  acceptedCount,
}: CompliancePoliciesSectionProps) {
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
    <>
      <div className="space-y-4 rounded-lg border p-4 md:p-5 bg-card">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Legal Agreements</h3>
            </div>
            <Badge
              variant={acceptedCount === legalDocs.length ? "default" : "secondary"}
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
            Review each agreement and accept all documents to continue registration.
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
    </>
  );
}
