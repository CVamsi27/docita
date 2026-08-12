import { FC } from "react";
import { Badge, Card, CardContent } from "@workspace/ui/components";
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
    <Card className="ui-card-surface">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
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
