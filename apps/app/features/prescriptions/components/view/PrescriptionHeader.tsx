
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, Edit, Lock, Printer, Share2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { format } from "date-fns";

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
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Prescription</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(createdAt), "MMMM d, yyyy")}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled>
                  <Lock className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upgrade to access WhatsApp sharing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
