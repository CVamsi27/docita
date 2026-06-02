"use client";

import { FC, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip, Pencil } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import type { ClaimStatus } from "@workspace/types";
import { getPatientFullName } from "@workspace/utils";
import { useRouter } from "next/navigation";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { useInsuranceClaimDetailLogic } from "@/features/insurance-claims/hooks/use-insurance-claim-detail-logic";
import {
  CLAIM_STATUS_LABELS,
  CLAIM_STATUS_TONE,
  CLAIM_STATUS_TRANSITIONS,
  CLAIM_TYPE_LABELS,
  centsToMajor,
} from "@/features/insurance-claims/lib/claim-display";

const Row: FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

export const InsuranceClaimDetailsUI: FC<{ id: string }> = ({ id }) => {
  const router = useRouter();
  const { formatCurrency } = useClinicCurrency();
  const {
    claim,
    loading,
    isError,
    error,
    refetch,
    runTransition,
    isTransitioning,
    attachableDocuments,
    handleAttachDocument,
    isAttachingDocument,
  } = useInsuranceClaimDetailLogic(id);

  const [target, setTarget] = useState<ClaimStatus | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [documentId, setDocumentId] = useState("");

  const status = useMemo((): "loading" | "error" | "empty" | "success" => {
    if (loading) return "loading";
    if (isError) return "error";
    if (!claim) return "empty";
    return "success";
  }, [loading, isError, claim]);

  const allowed = claim ? CLAIM_STATUS_TRANSITIONS[claim.status] : [];

  const handleConfirm = async () => {
    if (!target) return;
    await runTransition(target, {
      approvedAmount: target === "PARTIALLY_APPROVED" ? amount : undefined,
      denialReason: target === "DENIED" ? reason || undefined : undefined,
    });
    setTarget(null);
    setAmount(0);
    setReason("");
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Insurance Claim"
          actions={
            <div className="flex gap-2">
              {claim?.status === "DRAFT" && (
                <Button asChild variant="outline">
                  <Link href={`/insurance-claims/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => router.push("/insurance-claims")}
              >
                <ArrowLeft className="h-4 w-4" />
                All claims
              </Button>
            </div>
          }
        />
      }
    >
      <DataState
        status={status}
        loadingMessage="Loading claim…"
        errorMessage={error?.message}
        onRetry={() => void refetch()}
        emptyTitle="Claim not found"
      >
        {claim && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{claim.insurerName}</CardTitle>
                <Badge variant={CLAIM_STATUS_TONE[claim.status]}>
                  {CLAIM_STATUS_LABELS[claim.status]}
                </Badge>
              </CardHeader>
              <CardContent>
                <Row
                  label="Patient"
                  value={getPatientFullName(claim.patient, "—")}
                />
                <Row label="Type" value={CLAIM_TYPE_LABELS[claim.claimType]} />
                <Row label="Policy number" value={claim.policyNumber} />
                {claim.tpaName && <Row label="TPA" value={claim.tpaName} />}
                <Row
                  label="Claimed"
                  value={formatCurrency(centsToMajor(claim.claimedAmountCents))}
                />
                {claim.approvedAmountCents != null && (
                  <Row
                    label="Approved"
                    value={formatCurrency(
                      centsToMajor(claim.approvedAmountCents),
                    )}
                  />
                )}
                {claim.patientResponsibilityCents != null && (
                  <Row
                    label="Patient responsibility"
                    value={formatCurrency(
                      centsToMajor(claim.patientResponsibilityCents),
                    )}
                  />
                )}
                {claim.denialReason && (
                  <Row label="Denial reason" value={claim.denialReason} />
                )}
                {claim.notes && <Row label="Notes" value={claim.notes} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Update status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allowed.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This claim is in a final state.
                  </p>
                )}
                {allowed.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allowed.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={target === next ? "default" : "outline"}
                        onClick={() => setTarget(next)}
                      >
                        {CLAIM_STATUS_LABELS[next]}
                      </Button>
                    ))}
                  </div>
                )}

                {target === "PARTIALLY_APPROVED" && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Approved amount
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
                    />
                  </div>
                )}

                {target === "DENIED" && (
                  <Textarea
                    placeholder="Enter reason for denial"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                )}

                {target && (
                  <Button
                    className="w-full"
                    disabled={
                      isTransitioning ||
                      (target === "DENIED" && !reason.trim()) ||
                      (target === "PARTIALLY_APPROVED" && amount <= 0)
                    }
                    onClick={() => void handleConfirm()}
                  >
                    {isTransitioning
                      ? "Updating…"
                      : `Confirm: ${CLAIM_STATUS_LABELS[target]}`}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Claim documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(claim.documents?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No supporting documents attached yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {claim.documents?.map((document) => (
                      <li
                        key={document.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          {document.name}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <a href={document.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={documentId} onValueChange={setDocumentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient document" />
                    </SelectTrigger>
                    <SelectContent>
                      {attachableDocuments.map((document) => (
                        <SelectItem key={document.id} value={document.id}>
                          {document.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!documentId || isAttachingDocument}
                    onClick={() => void handleAttachDocument(documentId)}
                  >
                    {isAttachingDocument ? "Attaching…" : "Attach document"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DataState>
    </AppPageScaffold>
  );
};
