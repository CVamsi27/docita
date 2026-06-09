"use client";

import { formatDate } from "@workspace/utils";
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

export function EnterpriseContractsRevisionsDialog(props: EnterpriseContractsRevisionsDialogProps) {
  const { revisionsOpen, setRevisionsOpen, revisions } = props;
  return (
    <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revision history</DialogTitle>
          </DialogHeader>
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revisions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>By</TableHead>
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
