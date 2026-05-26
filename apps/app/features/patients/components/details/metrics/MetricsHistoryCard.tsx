import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { History } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/formatters";

function extractValue(values: Array<Record<string, unknown>>): string {
  if (!values || values.length === 0) return "—";

  return values
    .map((value) => {
      if (typeof value.valueString === "string") return value.valueString;
      if (typeof value.valueNumber === "number")
        return String(value.valueNumber);
      if (typeof value.valueBoolean === "boolean")
        return value.valueBoolean ? "Yes" : "No";
      if (typeof value.valueDate === "string")
        return formatDate(value.valueDate);
      if (value.option && typeof value.option === "object") {
        const option = value.option as { label?: string; value?: string };
        return option.label || option.value || "—";
      }
      if (value.valueJson && typeof value.valueJson === "object") {
        return JSON.stringify(value.valueJson);
      }
      return "—";
    })
    .join(", ");
}

interface MetricsHistoryCardProps {
  title: string;
  loading: boolean;
  filteredTimeline: Array<Record<string, unknown>>;
  emptyHistoryMessage: string;
}

export function MetricsHistoryCard({
  title,
  loading,
  filteredTimeline,
  emptyHistoryMessage,
}: MetricsHistoryCardProps) {
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
          <p className="text-sm text-muted-foreground">Loading history</p>
        ) : filteredTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHistoryMessage}</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredTimeline.map((record) => {
              const id = String(record.id || "");
              const definition = (record.definition || {}) as Record<
                string,
                unknown
              >;
              const category =
                ((definition.category || {}) as Record<string, unknown>) || {};
              const values =
                (record.values as Array<Record<string, unknown>>) || [];

              return (
                <div
                  key={id}
                  className="rounded-md border p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {String(definition.label || "Metric")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {String(category.name || "General")} •{" "}
                      {formatDateTime(String(record.recordedAt || new Date()))}
                    </div>
                  </div>
                  <Badge variant="outline" className="max-w-[50%] truncate">
                    {extractValue(values)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
