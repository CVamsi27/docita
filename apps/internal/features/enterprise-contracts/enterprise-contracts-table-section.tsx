"use client";

import { formatCurrency, formatDate } from "@workspace/utils";
import {
  enterpriseContractStatusBadgeClass,
  MINIMUM_SETUP_FEE_INR,
} from "./enterprise-contracts-helpers";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  AlertTriangle,
  FileText,
  Receipt,
  Users as UsersIcon,
} from "lucide-react";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsTableSectionProps = Pick<
  EnterpriseContractsPageState,
  | "rows"
  | "contractsTableStatus"
  | "contractsLoadError"
  | "contractsQuery"
  | "busy"
  | "openEdit"
  | "showMembers"
  | "showEstimate"
  | "showInvoices"
  | "generatePrepay"
  | "generateSetupFeeInvoice"
  | "openCustomBill"
  | "evaluateTrueUp"
  | "showAlerts"
  | "showRevisions"
>;

export function EnterpriseContractsTableSection({
  rows,
  contractsTableStatus,
  contractsLoadError,
  contractsQuery,
  busy,
  openEdit,
  showMembers,
  showEstimate,
  showInvoices,
  generatePrepay,
  generateSetupFeeInvoice,
  openCustomBill,
  evaluateTrueUp,
  showAlerts,
  showRevisions,
}: EnterpriseContractsTableSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All enterprise contracts</CardTitle>
        <CardDescription>
          Edit terms, manage member clinics for groups, generate prepay
          invoices, run true-up evaluations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataState
          status={contractsTableStatus}
          loadingMessage="Loading enterprise contracts…"
          errorMessage={contractsLoadError ?? undefined}
          onRetry={() => void contractsQuery.refetch()}
          emptyTitle="No contracts yet"
          emptyDescription="Create a contract to manage enterprise billing terms."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract # / group</TableHead>
                <TableHead>Primary clinic</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Platform fee</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">
                    <div className="font-mono">{row.contractNumber}</div>
                    {row.groupName && (
                      <div className="text-muted-foreground">
                        {row.groupName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.primaryClinicId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row.memberClinicIds.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={enterpriseContractStatusBadgeClass[row.status]}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(row.startDate)} → {formatDate(row.endDate)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(row.platformFeeCents / 100, {
                      currency: row.currency,
                    })}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {row.billingCycle.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => showMembers(row)}
                      aria-label="Members"
                    >
                      <UsersIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void showEstimate(row.id)}
                    >
                      Estimate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void showInvoices(row.id)}
                      aria-label="Invoices"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void generatePrepay(row.id)}
                      disabled={row.status !== "ACTIVE" || busy}
                    >
                      Prepay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void generateSetupFeeInvoice(row)}
                      disabled={
                        row.setupFeeCents < MINIMUM_SETUP_FEE_INR * 100 || busy
                      }
                    >
                      Setup fee
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCustomBill(row)}
                      disabled={busy}
                    >
                      Custom bill
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void evaluateTrueUp(row.id)}
                      disabled={row.status !== "ACTIVE" || busy}
                      aria-label="Evaluate true-up now"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void showAlerts(row.id)}
                    >
                      Alerts
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void showRevisions(row.id)}
                      aria-label="Revisions"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </CardContent>
    </Card>
  );
}
