"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  BaseContractDialogShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./base-dialog-shell";
import { X } from "lucide-react";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsMembersDialogProps = Pick<EnterpriseContractsPageState, 'membersOpen' | 'setMembersOpen' | 'activeContract' | 'newMemberClinicId' | 'setNewMemberClinicId' | 'addMember' | 'removeMember' | 'busy'>;

export function EnterpriseContractsMembersDialog(props: EnterpriseContractsMembersDialogProps) {
  const { membersOpen, setMembersOpen, activeContract, newMemberClinicId, setNewMemberClinicId, addMember, removeMember, busy } = props;
  return (
    <BaseContractDialogShell
      open={membersOpen}
      onOpenChange={setMembersOpen}
      title="Member clinics"
      description={`${activeContract?.contractNumber} · ${activeContract?.groupName ?? "no group name"}`}
    >
      {activeContract && (
        <div className="space-y-3 text-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeContract.memberClinicIds.map((cid) => (
                <TableRow key={cid}>
                  <TableCell className="font-mono text-xs">
                    {cid}
                    {cid === activeContract.primaryClinicId && (
                      <Badge className="ml-2" variant="outline">
                        primary
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void removeMember(cid)}
                      disabled={
                        busy || cid === activeContract.primaryClinicId
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-end gap-2 border-t pt-3">
            <div className="flex-1">
              <Label>Add clinic ID</Label>
              <Input
                value={newMemberClinicId}
                onChange={(e) => setNewMemberClinicId(e.target.value)}
                placeholder="cli_…"
              />
            </div>
            <Button onClick={() => void addMember()} disabled={busy}>
              Add
            </Button>
          </div>
        </div>
      )}
    </BaseContractDialogShell>
  );
}
