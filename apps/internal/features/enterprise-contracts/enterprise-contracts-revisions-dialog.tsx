"use client";

import { formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
// jscpd:ignore-end
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsRevisionsDialogProps = Pick<EnterpriseContractsPageState, 'revisionsOpen' | 'setRevisionsOpen' | 'revisions'>;

/**
 * Phase 3 (per-feature): apps/internal Enterprise Contracts > revisions dialog.
 * 5 literals converted to useTranslations("EnterpriseContracts.revisionsDialog").
 */
function useEnterpriseContractsRevisionsDialogTranslations() {
  return useTranslations("EnterpriseContracts.revisionsDialog");
}

export function EnterpriseContractsRevisionsDialog(props: EnterpriseContractsRevisionsDialogProps) {
  const t = useEnterpriseContractsRevisionsDialogTranslations();
  const { revisionsOpen, setRevisionsOpen, revisions } = props;
  return (
    <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("effectiveHead")}</TableHead>
                  <TableHead>{t("summaryHead")}</TableHead>
                  <TableHead>{t("byHead")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {formatDate(r.effectiveDate)}
                    </TableCell>
                    <TableCell className="text-xs">{r.changeSummary}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.createdById ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
  );
}
