"use client";

import { DataState } from "@workspace/ui/components/data-display/data-state";
import { useTranslations } from "next-intl";
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

/**
 * Phase 3 (per-feature): apps/internal Enterprise contracts > Table
 * section (admin contracts table with 7 columns). 8 literals converted
 * to useTranslations("InternalEnterpriseContracts.tableSection").
 */
function useTableSectionTranslations() {
  return useTranslations("InternalEnterpriseContracts.tableSection");
}

export function EnterpriseContractsTableSection({
  rows,
  contractsTableStatus,
  contractsLoadError,
  contractsQuery,
  ...rowActionProps
}: EnterpriseContractsTableSectionProps) {
  const t = useTableSectionTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataState
          status={contractsTableStatus}
          loadingMessage={t("loadingLabel")}
          errorMessage={contractsLoadError ?? undefined}
          onRetry={() => void contractsQuery.refetch()}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colContractGroup")}</TableHead>
                <TableHead>{t("colPrimaryClinic")}</TableHead>
                <TableHead>{t("colMembers")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colPeriod")}</TableHead>
                <TableHead>{t("colPlatformFee")}</TableHead>
                <TableHead className="text-right">{t("colActions")}</TableHead>
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
