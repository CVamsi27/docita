"use client";

import { formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { ExternalLink, FlaskConical } from "lucide-react";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Feature } from "@workspace/types";
import { useLabTestOrders } from "@workspace/data-access";
import { TierGate } from "@/components/auth/access-gates";

interface LabsTabProps {
  patientId: string;
}

export function LabsTab({ patientId }: LabsTabProps) {
  return (
    <TierGate feature={Feature.LAB_TESTS}>
      <LabsTabContent patientId={patientId} />
    </TierGate>
  );
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ORDERED: "outline",
  COLLECTED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

function LabsTabContent({ patientId }: LabsTabProps) {
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useLabTestOrders({ patientId });

  if (isLoading) {
    return <DataState status="loading" loadingMessage="Loading lab tests…" />;
  }

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load these lab tests. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={FlaskConical}
        emptyTitle="No lab tests ordered"
        emptyDescription="Lab orders for this patient will appear here once created."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const orderedAt = order.createdAt
          ? formatDate(order.createdAt, "EEE, d MMM yyyy")
          : "";
        const completedAt = order.completedAt
          ? formatDate(order.completedAt, "d MMM yyyy")
          : null;
        const variant = STATUS_VARIANT[order.status] ?? "outline";

        return (
          <Card key={order.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-warning" />
                    {order.labTest?.name ?? "Lab test"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ordered {orderedAt}
                    {order.doctor?.name
                      ? ` \u00b7 Dr. ${order.doctor.name}`
                      : ""}
                  </p>
                </div>
                <Badge variant={variant} className="shrink-0 text-xs">
                  {humanizeUiLabel(order.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.labTest?.category && (
                <p className="text-xs text-muted-foreground">
                  Category: {order.labTest.category}
                </p>
              )}
              {completedAt && (
                <p className="text-xs text-muted-foreground">
                  Completed {completedAt}
                </p>
              )}
              {order.notes && (
                <p className="text-xs text-foreground/80">{order.notes}</p>
              )}
              {order.resultUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <a
                    href={order.resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    View result
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
