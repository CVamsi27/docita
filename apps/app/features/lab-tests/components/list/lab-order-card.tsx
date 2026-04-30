"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { TestTube } from "lucide-react";

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
    pending: "badge-warning",
    collected: "badge-info",
    processing: "tier-pro",
    completed: "badge-success",
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
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
