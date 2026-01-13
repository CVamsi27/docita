import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

interface Condition {
  id: string; // or name if only name is available
  name: string;
  status?: string; // active, managed, resolved
}

interface SummaryConditionsProps {
  conditions: Condition[];
}

export function SummaryConditions({ conditions }: SummaryConditionsProps) {
  if (!conditions || conditions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Chronic Conditions
      </div>
      <div className="flex flex-wrap gap-2">
        {conditions.map((condition, i) => (
          <Badge
            key={i} // Using index as fallback key if id is not unique or present in all contexts
            variant="outline"
            className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50"
          >
            {condition.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
