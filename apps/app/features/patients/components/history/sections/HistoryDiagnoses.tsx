
import { Stethoscope } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface IcdCode {
  code: string;
  description: string;
}

interface Diagnosis {
  id: string;
  isPrimary: boolean;
  notes?: string;
  icdCode?: IcdCode;
}

export function HistoryDiagnoses({ diagnoses }: { diagnoses: Diagnosis[] }) {
  if (!diagnoses || diagnoses.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Stethoscope className="h-4 w-4 text-purple-600" />
        Diagnoses (ICD-10)
      </div>
      <div className="flex flex-wrap gap-2">
        {diagnoses.map((diagnosis) => (
          <Badge
            key={diagnosis.id}
            variant={diagnosis.isPrimary ? "default" : "secondary"}
            className="text-xs"
          >
            {diagnosis.icdCode ? (
              <>
                <span className="font-mono mr-1">{diagnosis.icdCode.code}</span>
                <span className="opacity-80">
                  {diagnosis.icdCode.description}
                </span>
              </>
            ) : (
              diagnosis.notes || "Diagnosis"
            )}
            {diagnosis.isPrimary && (
              <span className="ml-1 text-[10px]">(Primary)</span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
