import { FC, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { AppPageScaffold, Button, DataState, PageHeader } from "@workspace/ui/components";
import type { ClaimStatus } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useInsuranceClaimDetailLogic } from "@/features/insurance-claims/hooks/use-insurance-claim-detail-logic";
import { CLAIM_STATUS_TRANSITIONS } from "@/features/insurance-claims/lib/claim-display";
import {
  ClaimDetailsCard,
  UpdateStatusCard,
  ClaimDocumentsCard,
} from "./InsuranceClaimDetailsUISections";

export const InsuranceClaimDetailsUI: FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  const { currency } = useLocaleCurrency();
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

  const formatCurrency = (amount: number) =>
    formatCurrencyUtil(amount, currency);

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
                  <Link to={`/insurance-claims/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/insurance-claims")}
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
            <ClaimDetailsCard
              patient={claim.patient}
              insurerName={claim.insurerName}
              status={claim.status}
              claimType={claim.claimType}
              policyNumber={claim.policyNumber}
              tpaName={claim.tpaName}
              claimedAmountCents={claim.claimedAmountCents}
              approvedAmountCents={claim.approvedAmountCents}
              patientResponsibilityCents={claim.patientResponsibilityCents}
              denialReason={claim.denialReason}
              notes={claim.notes}
              formatCurrency={formatCurrency}
            />
            <UpdateStatusCard
              allowed={allowed}
              target={target}
              isTransitioning={isTransitioning}
              amount={amount}
              reason={reason}
              onTargetChange={setTarget}
              onAmountChange={setAmount}
              onReasonChange={setReason}
              onConfirm={handleConfirm}
            />
            <ClaimDocumentsCard
              documents={claim.documents}
              attachableDocuments={attachableDocuments}
              documentId={documentId}
              onDocumentIdChange={setDocumentId}
              isAttachingDocument={isAttachingDocument}
              onAttachDocument={handleAttachDocument}
            />
          </div>
        )}
      </DataState>
    </AppPageScaffold>
  );
};
