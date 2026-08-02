import { Badge, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import type { MetricRecordResponse } from "@workspace/types";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/formatters";
import { extractValue } from "@/features/patients/components/details/patient-metrics-value-formatter";

interface MetricsHistoryCardProps {
  title: string;
  loading: boolean;
  filteredTimeline: MetricRecordResponse[];
  emptyHistoryMessage: string;
}

export function MetricsHistoryCard({
  title,
  loading,
  filteredTimeline,
  emptyHistoryMessage,
}: MetricsHistoryCardProps) {
  const { t } = useTranslation("Patients");
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("metrics.loadingHistory")}</p>
        ) : filteredTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHistoryMessage}</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredTimeline.map((record) => (
              <div
                key={record.id}
                className="rounded-md border p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium">
                    {record.definition.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {record.definition.category.name ?? t("metrics.generalCategory")} •{" "}
                    {formatDateTime(record.recordedAt)}
                  </div>
                </div>
                <Badge variant="outline" className="max-w-[50%] truncate">
                  {extractValue(record.values)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
