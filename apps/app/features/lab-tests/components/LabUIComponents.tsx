"use client";

import { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  TestTube,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

// Lab Order Card
export const LabOrderCard: FC<{
  order?: {
    id: string;
    testName: string;
    patientName: string;
    status: "pending" | "collected" | "processing" | "completed";
    orderedAt: string;
  };
}> = ({ order }) => {
  if (!order) return null;

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    collected: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <TestTube className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{order.testName}</p>
            <p className="text-sm text-muted-foreground">{order.patientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {order.orderedAt}
          </span>
          <Badge className={statusColors[order.status]}>{order.status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Lab Results Summary
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
                  <span className="font-mono">{result.value}</span>
                  <span className="text-sm text-muted-foreground">
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

// Lab Order Form
export interface LabTestOption {
  id: string;
  name: string;
  category: string;
}

export const LabOrderForm: FC<{
  onSubmit?: (order: { tests: string[] }) => void;
  availableTests?: LabTestOption[];
}> = ({ onSubmit, availableTests = [] }) => {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleTest = (testId: string) => {
    setSelectedTests((prev: string[]) =>
      prev.includes(testId)
        ? prev.filter((id: string) => id !== testId)
        : [...prev, testId],
    );
  };

  const filteredTests = availableTests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Order Lab Tests</CardTitle>
        <CardDescription>Select tests to order for patient</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <input
            className="w-full p-2 rounded-md border bg-background"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer border ${selectedTests.includes(test.id) ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-transparent"}`}
              onClick={() => toggleTest(test.id)}
            >
              <div>
                <p className="font-medium text-sm">{test.name}</p>
                <p className="text-xs text-muted-foreground">{test.category}</p>
              </div>
              {selectedTests.includes(test.id) && (
                <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedTests.length} tests selected
          </p>
          <Button
            disabled={selectedTests.length === 0}
            onClick={() => onSubmit?.({ tests: selectedTests })}
          >
            Place Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
