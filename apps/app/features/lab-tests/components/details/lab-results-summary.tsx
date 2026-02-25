"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";

export const LabResultsSummary: FC<{
  results?: Array<{
    testName: string;
    value: string;
    status: "normal" | "low" | "high" | "critical";
    unit: string;
  }>;
}> = ({ results = [] }) => {
  const statusIcons = {
    normal: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    low: <AlertTriangle className="h-4 w-4 text-blue-600" />,
    high: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Lab Results</CardTitle>
            <CardDescription>Recent test results</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No lab results available
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {statusIcons[result.status]}
                  <span className="font-medium">{result.testName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{result.value}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
