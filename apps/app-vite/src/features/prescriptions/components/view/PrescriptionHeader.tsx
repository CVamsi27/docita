import { Button, SymbolTooltip } from "@workspace/ui/components";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import { formatDate } from "@workspace/utils";
import { WhatsAppDeliveryBadge } from "@/components/whatsapp/whatsapp-delivery-badge";

interface PrescriptionHeaderProps {
  createdAt: string;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onPrint: () => void;
  whatsappStatus?: string | null;
  whatsappSentAt?: string | Date | null;
  onWhatsappRetry?: () => void;
  isWhatsappRetrying?: boolean;
}

export function PrescriptionHeader({
  createdAt,
  canEdit,
  onBack,
  onEdit,
  onPrint,
  whatsappStatus,
  whatsappSentAt,
  onWhatsappRetry,
  isWhatsappRetrying,
}: PrescriptionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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
      <div className="flex flex-wrap items-center gap-2">
        <WhatsAppDeliveryBadge
          status={whatsappStatus}
          sentAt={whatsappSentAt ?? null}
          onRetry={onWhatsappRetry}
          isRetrying={isWhatsappRetrying}
        />
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
