import { FC, useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataState,
} from "@workspace/ui/components";
import { useInsuranceClaimsByPatient } from "@workspace/data-access";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import {
  CLAIM_STATUS_LABELS,
  CLAIM_STATUS_TONE,
  centsToMajor,
} from "@/features/insurance-claims/lib/claim-display";

/** Insurance-claims summary for the patient detail page. */
export const PatientClaimsPanel: FC<{ patientId: string }> = ({
  patientId,
}) => {
  const { currency } = useLocaleCurrency();
  const { data, isPending, isError, error, refetch } =
    useInsuranceClaimsByPatient(patientId);

  const formatCurrency = (amount: number) =>
    formatCurrencyUtil(amount, currency);

  const claims = data?.items ?? [];

  const status = useMemo((): "loading" | "error" | "empty" | "success" => {
    if (isPending) return "loading";
    if (isError) return "error";
    if (claims.length === 0) return "empty";
    return "success";
  }, [isPending, isError, claims.length]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Insurance Claims</CardTitle>
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link to={`/insurance-claims/new?patientId=${patientId}`}>
            <Plus className="h-4 w-4" />
            New
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <DataState
          status={status}
          loadingMessage="Loading claims…"
          errorMessage={error?.message}
          onRetry={() => void refetch()}
          emptyTitle="No claims"
          emptyDescription="This patient has no insurance claims yet."
        >
          <ul className="divide-y">
            {claims.map((claim) => (
              <li key={claim.id}>
                <Link
                  to={`/insurance-claims/${claim.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{claim.insurerName}</span>
                  <span className="flex items-center gap-3">
                    {formatCurrency(centsToMajor(claim.claimedAmountCents))}
                    <Badge variant={CLAIM_STATUS_TONE[claim.status]}>
                      {CLAIM_STATUS_LABELS[claim.status]}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DataState>
      </CardContent>
    </Card>
  );
};
