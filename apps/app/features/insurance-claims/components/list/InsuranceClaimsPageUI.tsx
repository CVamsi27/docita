"use client";

import { FC, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { AppPageScaffold, Badge, Button, Card, CardContent, DataState, DataTable, ListRow, PageHeader, type DataTableColumn } from "@workspace/ui/components";
import type { InsuranceClaim } from "@workspace/types";
import { getPatientFullName } from "@workspace/utils";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { useInsuranceClaimsLogic } from "@/features/insurance-claims/hooks/use-insurance-claims-logic";
import {
  CLAIM_STATUS_LABELS,
  CLAIM_STATUS_TONE,
  CLAIM_TYPE_LABELS,
  centsToMajor,
} from "@/features/insurance-claims/lib/claim-display";

const STATUS_OPTIONS = [
  "all",
  "DRAFT",
  "SUBMITTED",
  "INFO_REQUESTED",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "DENIED",
  "SETTLED",
  "CANCELLED",
  "APPEALED",
] as const;

export const InsuranceClaimsPageUI: FC = () => {
  const router = useRouter();
  const { formatCurrency } = useClinicCurrency();
  const {
    claims,
    loading,
    isError,
    error,
    refetch,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
  } = useInsuranceClaimsLogic();

  const listStatus = useMemo((): "loading" | "error" | "empty" | "success" => {
    if (loading) return "loading";
    if (isError) return "error";
    if (claims.length === 0) return "empty";
    return "success";
  }, [loading, isError, claims.length]);

  const patientName = (claim: InsuranceClaim) =>
    getPatientFullName(claim.patient, "—");

  const columns: DataTableColumn<InsuranceClaim>[] = [
    {
      id: "patient",
      header: "Patient",
      cell: (claim) => (
        <span className="font-medium">{patientName(claim)}</span>
      ),
    },
    {
      id: "insurer",
      header: "Insurer",
      hiddenOnMobile: true,
      cell: (claim) => claim.insurerName,
    },
    {
      id: "type",
      header: "Type",
      hiddenOnMobile: true,
      cell: (claim) => CLAIM_TYPE_LABELS[claim.claimType],
    },
    {
      id: "claimed",
      header: "Claimed",
      align: "right",
      cell: (claim) => formatCurrency(centsToMajor(claim.claimedAmountCents)),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => (
        <Badge variant={CLAIM_STATUS_TONE[claim.status]}>
          {CLAIM_STATUS_LABELS[claim.status]}
        </Badge>
      ),
    },
  ];

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Insurance Claims"
          description="Track cashless pre-authorizations and reimbursement claims, newest first."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void refetch()}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button asChild className="gap-2">
                <Link href="/insurance-claims/new">
                  <Plus className="h-4 w-4" />
                  New Claim
                </Link>
              </Button>
            </div>
          }
        />
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row">
          <Input
            placeholder="Search insurer, policy, patient…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:max-w-[200px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : CLAIM_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-2">
          <DataState
            status={listStatus}
            loadingMessage="Loading claims…"
            errorMessage={error?.message}
            onRetry={() => void refetch()}
            emptyTitle="No insurance claims yet"
            emptyDescription="Create a pre-authorization or reimbursement claim to get started."
          >
            <DataTable
              columns={columns}
              data={claims}
              rowKey={(claim) => claim.id ?? ""}
              onRowClick={(claim) =>
                router.push(`/insurance-claims/${claim.id}`)
              }
              stackOnMobile
              mobileRenderer={(claim) => (
                <ListRow
                  token={(claim.id ?? "").slice(0, 8).toUpperCase()}
                  title={patientName(claim)}
                  meta={`${claim.insurerName} · ${CLAIM_TYPE_LABELS[claim.claimType]}`}
                  showChevron={false}
                  onClick={() => router.push(`/insurance-claims/${claim.id}`)}
                  trailing={
                    <>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(centsToMajor(claim.claimedAmountCents))}
                      </span>
                      <Badge variant={CLAIM_STATUS_TONE[claim.status]}>
                        {CLAIM_STATUS_LABELS[claim.status]}
                      </Badge>
                    </>
                  }
                />
              )}
            />
          </DataState>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
};
