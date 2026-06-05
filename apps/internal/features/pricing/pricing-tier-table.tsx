"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  type InternalTierPricingRow,
} from "@workspace/data-access/internal";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { Save, Sparkles } from "lucide-react";
import type { EditableTierRow } from "./pricing-helpers";

interface Props {
  tiers: EditableTierRow[];
  savingId: string | null;
  onFieldChange: (
    tierId: string,
    field: keyof InternalTierPricingRow,
    value: number | string,
  ) => void;
  onSave: (tier: EditableTierRow) => void;
}

function NumericCell({
  tierId,
  field,
  value,
  onChange,
}: {
  tierId: string;
  field: keyof InternalTierPricingRow;
  value: number;
  onChange: Props["onFieldChange"];
}) {
  return (
    <Input
      type="number"
      className="w-24 h-7 text-xs"
      value={value}
      onChange={(e) =>
        onChange(tierId, field, parseInt(e.target.value, 10) || 0)
      }
    />
  );
}

export function PricingTierTable({ tiers, savingId, onFieldChange, onSave }: Props) {
  if (tiers.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No tier pricing rows"
        description="Run the billing seed script to populate tier pricing before editing."
      />
    );
  }

  return (
    <div className="overflow-x-hidden">
      <Table className="min-w-[96rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Tier</TableHead>
            <TableHead>Monthly (cents)</TableHead>
            <TableHead>Patients</TableHead>
            <TableHead>Appointments</TableHead>
            <TableHead>Storage GB</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Patient overage</TableHead>
            <TableHead>Appt overage</TableHead>
            <TableHead>Rx overage</TableHead>
            <TableHead>Invoice overage</TableHead>
            <TableHead>OCR Overage</TableHead>
            <TableHead>API Overage</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => (
            <TableRow key={tier.id}>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-xs">{tier.tier}</span>
                  {tier.isDirty && (
                    <Badge
                      variant="outline"
                      className="text-xs px-1 py-0 h-4"
                    >
                      unsaved
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="monthlyBasePriceCents"
                  value={tier.monthlyBasePriceCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="includedPatients"
                  value={tier.includedPatients}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="includedAppointments"
                  value={tier.includedAppointments}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="includedStorageGB"
                  value={tier.includedStorageGB}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="includedUsers"
                  value={tier.includedUsers}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overagePatientCents"
                  value={tier.overagePatientCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overageAppointmentCents"
                  value={tier.overageAppointmentCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overagePrescriptionCents"
                  value={tier.overagePrescriptionCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overageInvoiceCents"
                  value={tier.overageInvoiceCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overageOcrPageCents"
                  value={tier.overageOcrPageCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <NumericCell
                  tierId={tier.id}
                  field="overageApiCallCents"
                  value={tier.overageApiCallCents}
                  onChange={onFieldChange}
                />
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant={tier.isDirty ? "default" : "outline"}
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={savingId === tier.id || !tier.isDirty}
                  onClick={() => onSave(tier)}
                >
                  {savingId === tier.id ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      iconClassName="h-3 w-3"
                    />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
