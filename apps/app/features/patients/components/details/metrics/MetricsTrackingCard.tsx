import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Layers } from "lucide-react";

interface MetricsTrackingCardProps {
  loading: boolean;
  readOnly: boolean;
  categories: Array<Record<string, unknown>>;
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
          categories.map((category) => {
            const categoryId = String(category.id || "");
            const categoryName = String(category.name || "Unnamed Category");
            const definitions =
              (category.metricDefinitions as Array<Record<string, unknown>>) ||
              [];

            return (
              <div key={categoryId} className="rounded-lg border p-3">
                <div className="font-medium text-sm mb-2">{categoryName}</div>
                <div className="space-y-2">
                  {definitions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {emptyDefinitionsMessage}
                    </p>
                  ) : (
                    definitions.map((definition) => {
                      const definitionId = String(definition.id || "");
                      const isTracked =
                        selectionMap.get(definitionId) ??
                        Boolean(definition.isTracked);

                      return (
                        <label
                          key={definitionId}
                          className="flex items-center justify-between gap-3 rounded border px-3 py-2"
                        >
                          <span className="text-sm">
                            {String(definition.label || "Metric")}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Track
                            </span>
                            <Checkbox
                              checked={isTracked}
                              disabled={readOnly || isPending}
                              onCheckedChange={(value) =>
                                onToggleTracked(definitionId, Boolean(value))
                              }
                            />
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
