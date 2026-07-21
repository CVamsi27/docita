import { Card, CardContent, CardHeader, CardTitle, Checkbox } from "@workspace/ui/components";
import type { MetricCategoryResponse } from "@workspace/types";
import { Layers } from "lucide-react";

interface MetricsTrackingCardProps {
  loading: boolean;
  readOnly: boolean;
  categories: MetricCategoryResponse[];
  selectionMap: Map<string, boolean>;
  emptyDefinitionsMessage: string;
  onToggleTracked: (definitionId: string, isTracked: boolean) => void;
  isPending: boolean;
}

export function MetricsTrackingCard({
  loading,
  readOnly,
  categories,
  selectionMap,
  emptyDefinitionsMessage,
  onToggleTracked,
  isPending,
}: MetricsTrackingCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Categories & Tracked Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading metrics</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="rounded-lg border p-3">
              <div className="font-medium text-sm mb-2">
                {category.name || "Unnamed Category"}
              </div>
              <div className="space-y-2">
                {category.metricDefinitions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {emptyDefinitionsMessage}
                  </p>
                ) : (
                  category.metricDefinitions.map((definition) => {
                    const isTracked =
                      selectionMap.get(definition.id) ??
                      Boolean(definition.isTrackedByDefault);
                    return (
                      <label
                        key={definition.id}
                        className="flex items-center justify-between gap-3 rounded border px-3 py-2"
                      >
                        <span className="text-sm">
                          {definition.label || "Metric"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Track
                          </span>
                          <Checkbox
                            checked={isTracked}
                            disabled={readOnly || isPending}
                            onCheckedChange={(value) =>
                              onToggleTracked(definition.id, Boolean(value))
                            }
                          />
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
