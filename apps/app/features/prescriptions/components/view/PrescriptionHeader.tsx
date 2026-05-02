"use client";

import { Button } from "@workspace/ui/components/button";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { ArrowLeft, Edit, Lock, Printer, Share2 } from "lucide-react";
import { formatDate } from "@workspace/utils";

interface PrescriptionHeaderProps {
  createdAt: string;
  canEdit: boolean;
  hasWhatsAppAccess: boolean;
  onBack: () => void;
  onEdit: () => void;
  onShareWhatsApp: () => void;
  onPrint: () => void;
}

export function PrescriptionHeader({
  createdAt,
  canEdit,
  hasWhatsAppAccess,
  onBack,
  onEdit,
  onShareWhatsApp,
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
        {hasWhatsAppAccess ? (
          <Button variant="outline" size="sm" onClick={onShareWhatsApp}>
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                <Lock className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>WhatsApp</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
