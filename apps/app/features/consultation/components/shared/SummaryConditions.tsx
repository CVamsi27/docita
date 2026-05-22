import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";

interface Condition {
  id: string; 
  name: string;
  status?: string; 
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
            key={i} 
            variant="outline"
            className="border-warning/30 bg-warning text-warning hover:bg-warning"
          >
            {condition.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
