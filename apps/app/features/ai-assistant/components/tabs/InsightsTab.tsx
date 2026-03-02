import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export const InsightsTab = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <InsightCard
      title="No-Show Prediction"
      description="Patients likely to miss appointments"
      color="blue"
    >
      <div className="space-y-3">
        <RiskItem
          name="John Smith"
          time="Tomorrow, 10:00 AM"
          risk="78% risk"
          variant="destructive"
        />
        <RiskItem
          name="Sarah Johnson"
          time="Tomorrow, 2:30 PM"
          risk="52% risk"
          variant="secondary"
        />
        <Button variant="outline" className="w-full" size="sm">
          Send Reminders
        </Button>
      </div>
    </InsightCard>

    <InsightCard
      title="Patient Segmentation"
      description="AI-powered patient grouping"
      color="purple"
    >
      <div className="space-y-2">
        <SegmentItem label="Chronic Care" count="156 patients" />
        <SegmentItem
          label="High Risk"
          count="42 patients"
          variant="destructive"
        />
        <SegmentItem
          label="Due for Follow-up"
          count="89 patients"
          variant="secondary"
        />
        <SegmentItem
          label="Lost to Follow-up"
          count="23 patients"
          variant="outline"
        />
      </div>
    </InsightCard>

    <InsightCard
      title="Anomaly Detection"
      description="Unusual patterns detected"
      color="green"
    >
      <div className="space-y-3">
        <AnomalyItem
          title="Revenue Drop"
          description="15% decrease in invoice collections this week"
          type="warning"
        />
        <AnomalyItem
          title="Appointment Surge"
          description="30% increase in respiratory complaints"
          type="info"
        />
      </div>
    </InsightCard>
  </div>
);

interface InsightCardProps {
  title: string;
  description: string;
  color?: string;
  children: React.ReactNode;
}

const InsightCard = ({ title, description, children }: InsightCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

interface RiskItemProps {
  name: string;
  time: string;
  risk: string;
  variant: "destructive" | "secondary" | "outline" | "default";
}

const RiskItem = ({ name, time, risk, variant }: RiskItemProps) => (
  <div
    className={cn(
      "flex items-center justify-between p-3 rounded-lg",
      variant === "destructive"
        ? "surface-danger"
        : "surface-warning",
    )}
  >
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <Badge variant={variant}>{risk}</Badge>
  </div>
);

interface SegmentItemProps {
  label: string;
  count: string;
  variant?: "destructive" | "secondary" | "outline" | "default";
}

const SegmentItem = ({ label, count, variant }: SegmentItemProps) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Badge variant={variant}>{count}</Badge>
  </div>
);

interface AnomalyItemProps {
  title: string;
  description: string;
  type: "warning" | "info";
}

const AnomalyItem = ({ title, description, type }: AnomalyItemProps) => (
  <div
    className={cn(
      "p-3 rounded-lg",
      type === "warning"
        ? "surface-warning"
        : "surface-info",
    )}
  >
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);
