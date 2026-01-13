
import { FileText } from "lucide-react";

export function HistoryObservations({ observations }: { observations: string }) {
  if (!observations) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" />
        Clinical Observations
      </div>
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm whitespace-pre-wrap font-mono">{observations}</p>
      </div>
    </div>
  );
}
