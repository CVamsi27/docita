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

const InsightCard = ({ title, description, color, children }: any) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const RiskItem = ({ name, time, risk, variant }: any) => (
  <div
    className={cn(
      "flex items-center justify-between p-3 rounded-lg",
      variant === "destructive"
        ? "bg-red-50 dark:bg-red-950/20"
        : "bg-orange-50 dark:bg-orange-950/20",
    )}
  >
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <Badge variant={variant}>{risk}</Badge>
  </div>
);

const SegmentItem = ({ label, count, variant }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Badge variant={variant}>{count}</Badge>
  </div>
);

const AnomalyItem = ({ title, description, type }: any) => (
  <div
    className={cn(
      "p-3 rounded-lg border",
      type === "warning"
        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200"
        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
    )}
  >
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);
