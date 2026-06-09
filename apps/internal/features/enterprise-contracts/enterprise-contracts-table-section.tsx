"use client";

import { DataState } from "@workspace/ui/components/data-display/data-state";
// jscpd:ignore-start
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
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
// jscpd:ignore-end
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";
import { EnterpriseContractTableRow } from "./enterprise-contracts-table-row";
import type { EnterpriseContractRowActionsProps } from "./enterprise-contracts-row-actions";

// SSOT: the row-scoped action props (busy + the ten action callbacks) are
// defined once on `EnterpriseContractRowActionsProps` and reused here via
// `Omit<…, "row">` rather than re-listing the same `Pick` keys.
type EnterpriseContractsTableSectionProps = Pick<
  EnterpriseContractsPageState,
  "rows" | "contractsTableStatus" | "contractsLoadError" | "contractsQuery"
> &
  Omit<EnterpriseContractRowActionsProps, "row">;

export function EnterpriseContractsTableSection({
  rows,
  contractsTableStatus,
  contractsLoadError,
  contractsQuery,
  ...rowActionProps
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
                <EnterpriseContractTableRow
                  key={row.id}
                  row={row}
                  {...rowActionProps}
                />
              ))}
            </TableBody>
          </Table>
        </DataState>
      </CardContent>
    </Card>
  );
}
