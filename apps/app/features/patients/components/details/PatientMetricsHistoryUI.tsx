import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { History, Layers, Plus, Settings2 } from "lucide-react";
import {
  useCreatePatientMetricCategory,
  useCreatePatientMetricDefinition,
  usePatientMetricCategories,
  usePatientMetricHistory,
  usePatientSelectedMetrics,
  useRecordPatientMetricValue,
  useUpdatePatientSelectedMetrics,
} from "@/features/patients/hooks/usePatients";
import { formatDateTime } from "@/lib/formatters";
import {
  type MetricValueType,
  type PatientMetricsHistoryUIProps,
  extractValue,
} from "./patient-metrics-history-helpers";

export function PatientMetricsHistoryUI({
  patientId,
  readOnly = false,
  className,
  categoryKey,
  title = "Complete Metrics History",
  emptyHistoryMessage = "No metric records yet, add a metric value to start tracking",
  emptyDefinitionsMessage = "No metrics in this category yet",
  showTracking = true,
  showConfiguration = !readOnly,
  showRecording = !readOnly,
}: PatientMetricsHistoryUIProps) {
  const { data: categoriesData, isLoading: loadingCategories } =
    usePatientMetricCategories(patientId);
  const { data: historyData, isLoading: loadingHistory } =
    usePatientMetricHistory(patientId);
  const { data: selectedData, isLoading: loadingSelected } =
    usePatientSelectedMetrics(patientId);

  const createCategory = useCreatePatientMetricCategory(patientId);
  const createDefinition = useCreatePatientMetricDefinition(patientId);
  const updateSelections = useUpdatePatientSelectedMetrics(patientId);
  const recordValue = useRecordPatientMetricValue(patientId);

  const [newCategoryKey, setNewCategoryKey] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [definitionCategoryId, setDefinitionCategoryId] = useState("");
  const [newDefinitionKey, setNewDefinitionKey] = useState("");
  const [newDefinitionLabel, setNewDefinitionLabel] = useState("");
  const [newDefinitionType, setNewDefinitionType] =
    useState<MetricValueType>("TEXT");
  const [newDefinitionUnit, setNewDefinitionUnit] = useState("");
  const [newDefinitionTracked, setNewDefinitionTracked] = useState(true);

  const [valueDefinitionId, setValueDefinitionId] = useState("");
  const [valueInput, setValueInput] = useState("");

  const categories = useMemo(
    () =>
      ((categoriesData as Array<Record<string, unknown>>) || []).filter(
        (category) =>
          !categoryKey || String(category.key || "") === categoryKey,
      ),
    [categoriesData, categoryKey],
  );
  const selectedMetrics = useMemo(
    () => (selectedData as Array<Record<string, unknown>>) || [],
    [selectedData],
  );

  const selectionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    selectedMetrics.forEach((metric) => {
      if (typeof metric.id === "string") {
        map.set(metric.id, Boolean(metric.isTracked));
      }
    });
    return map;
  }, [selectedMetrics]);

  const filteredTimeline = useMemo(
    () => {
      const timeline =
        ((historyData as { timeline?: Array<Record<string, unknown>> })
          ?.timeline as Array<Record<string, unknown>> | undefined) || [];

      return timeline.filter((record) => {
        if (!categoryKey) {
          return true;
        }
        const definition = (record.definition || {}) as Record<string, unknown>;
        const category =
          ((definition.category || {}) as Record<string, unknown>) || {};
        return String(category.key || "") === categoryKey;
      });
    },
    [categoryKey, historyData],
  );

  const flatDefinitions = useMemo(() => {
    const output: Array<{ id: string; label: string; valueType: string }> = [];
    categories.forEach((category) => {
      const definitions =
        (category.metricDefinitions as Array<Record<string, unknown>>) || [];
      definitions.forEach((definition) => {
        if (
          typeof definition.id === "string" &&
          typeof definition.label === "string"
        ) {
          output.push({
            id: definition.id,
            label: definition.label,
            valueType:
              typeof definition.valueType === "string"
                ? definition.valueType
                : "STRING",
          });
        }
      });
    });
    return output;
  }, [categories]);

  const onAddCategory = () => {
    if (!newCategoryKey.trim() || !newCategoryName.trim()) return;
    createCategory.mutate(
      {
        key: newCategoryKey.trim(),
        name: newCategoryName.trim(),
      },
      {
        onSuccess: () => {
          setNewCategoryKey("");
          setNewCategoryName("");
        },
      },
    );
  };

  const onAddDefinition = () => {
    if (
      !definitionCategoryId ||
      !newDefinitionKey.trim() ||
      !newDefinitionLabel.trim()
    ) {
      return;
    }

    createDefinition.mutate(
      {
        categoryId: definitionCategoryId,
        key: newDefinitionKey.trim(),
        label: newDefinitionLabel.trim(),
        valueType: newDefinitionType,
        unit: newDefinitionUnit.trim() || undefined,
        isTrackedByDefault: newDefinitionTracked,
        isPatientScoped: true,
      },
      {
        onSuccess: () => {
          setNewDefinitionKey("");
          setNewDefinitionLabel("");
          setNewDefinitionUnit("");
          setNewDefinitionTracked(true);
        },
      },
    );
  };

  const onToggleTracked = (definitionId: string, isTracked: boolean) => {
    updateSelections.mutate({
      items: [{ definitionId, isTracked }],
    });
  };

  const onRecordValue = () => {
    if (!valueDefinitionId || !valueInput.trim()) return;

    const definition = flatDefinitions.find(
      (item) => item.id === valueDefinitionId,
    );

    if (!definition) return;

    if (definition.valueType === "NUMBER") {
      const numberValue = Number(valueInput);
      if (!Number.isFinite(numberValue)) return;
      recordValue.mutate({
        definitionId: valueDefinitionId,
        valueNumber: numberValue,
        source: "MANUAL",
      });
      setValueInput("");
      return;
    }

    if (definition.valueType === "BOOLEAN") {
      recordValue.mutate({
        definitionId: valueDefinitionId,
        valueBoolean: valueInput.toLowerCase() === "true",
        source: "MANUAL",
      });
      setValueInput("");
      return;
    }

    recordValue.mutate({
      definitionId: valueDefinitionId,
      valueString: valueInput,
      source: "MANUAL",
    });
    setValueInput("");
  };

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading history</p>
          ) : filteredTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyHistoryMessage}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredTimeline.map((record) => {
                const id = String(record.id || "");
                const definition = (record.definition || {}) as Record<
                  string,
                  unknown
                >;
                const category =
                  ((definition.category || {}) as Record<string, unknown>) ||
                  {};
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

      {showTracking && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Categories & Tracked Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCategories || loadingSelected ? (
              <p className="text-sm text-muted-foreground">Loading metrics</p>
            ) : (
              categories.map((category) => {
                const categoryId = String(category.id || "");
                const categoryName = String(
                  category.name || "Unnamed Category",
                );
                const definitions =
                  (category.metricDefinitions as Array<
                    Record<string, unknown>
                  >) || [];

                return (
                  <div key={categoryId} className="rounded-lg border p-3">
                    <div className="font-medium text-sm mb-2">
                      {categoryName}
                    </div>
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
                                  disabled={
                                    readOnly || updateSelections.isPending
                                  }
                                  onCheckedChange={(value) =>
                                    onToggleTracked(
                                      definitionId,
                                      Boolean(value),
                                    )
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
      )}

      {showConfiguration && !readOnly && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Add Category / Custom Metric Field
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm">New Category</Label>
              <Input
                placeholder="Category key"
                value={newCategoryKey}
                onChange={(event) => setNewCategoryKey(event.target.value)}
              />
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
              <Button
                onClick={onAddCategory}
                disabled={createCategory.isPending}
                type="button"
              >
                Add Category
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">New Custom Metric Field</Label>
              <Select
                value={definitionCategoryId}
                onValueChange={setDefinitionCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={String(category.id || "")}
                      value={String(category.id || "")}
                    >
                      {String(category.name || "Unnamed Category")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Field key"
                value={newDefinitionKey}
                onChange={(event) => setNewDefinitionKey(event.target.value)}
              />
              <Input
                placeholder="Field label"
                value={newDefinitionLabel}
                onChange={(event) => setNewDefinitionLabel(event.target.value)}
              />
              <Select
                value={newDefinitionType}
                onValueChange={(value) =>
                  setNewDefinitionType(value as MetricValueType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Value type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="NUMBER">Number</SelectItem>
                  <SelectItem value="BOOLEAN">Boolean</SelectItem>
                  <SelectItem value="DATE">Date</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Unit"
                value={newDefinitionUnit}
                onChange={(event) => setNewDefinitionUnit(event.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={newDefinitionTracked}
                  onCheckedChange={(value) =>
                    setNewDefinitionTracked(Boolean(value))
                  }
                />
                Track by default
              </label>
              <Button
                onClick={onAddDefinition}
                disabled={createDefinition.isPending}
                type="button"
              >
                Add Custom Field
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showRecording && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-primary" />
              {categoryKey === "vitals"
                ? "Record Vitals Value"
                : "Record Metric Value"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select
                value={valueDefinitionId}
                onValueChange={setValueDefinitionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  {flatDefinitions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No metrics available yet
                    </SelectItem>
                  ) : (
                    flatDefinitions.map((definition) => (
                      <SelectItem key={definition.id} value={definition.id}>
                        {definition.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder="Value"
                value={valueInput}
                onChange={(event) => setValueInput(event.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={onRecordValue}
              disabled={recordValue.isPending}
            >
              Save
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
