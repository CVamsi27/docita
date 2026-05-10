"use client";

import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import { formatDate } from "@workspace/utils";

interface PrescriptionHeaderProps {
  createdAt: string;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onPrint: () => void;
}

export function PrescriptionHeader({
  createdAt,
  canEdit,
  onBack,
  onEdit,
  onPrint,
}: PrescriptionHeaderProps) {
  return (
    <div className="flex items-center justify-between print:hidden">
      <div className="flex items-center gap-4">
        <SymbolTooltip label="Back to prescriptions">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to prescriptions"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </SymbolTooltip>
        <div>
          <h1 className="ui-page-title">Prescription</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(createdAt, "MMMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
        <Button onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
