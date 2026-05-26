import { useMemo, useState } from "react";
import {
  useCreatePatientMetricCategory,
  useCreatePatientMetricDefinition,
  usePatientMetricCategories,
  usePatientMetricHistory,
  usePatientSelectedMetrics,
  useRecordPatientMetricValue,
  useUpdatePatientSelectedMetrics,
} from "@/features/patients/hooks/usePatients";
import {
  type MetricValueType,
  type PatientMetricsHistoryUIProps,
} from "./patient-metrics-history-helpers";
import { MetricsHistoryCard } from "@/features/patients/components/details/metrics/MetricsHistoryCard";
import { MetricsTrackingCard } from "@/features/patients/components/details/metrics/MetricsTrackingCard";
import { MetricsConfigurationCard } from "@/features/patients/components/details/metrics/MetricsConfigurationCard";
import { MetricsRecordCard } from "@/features/patients/components/details/metrics/MetricsRecordCard";

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

  const filteredTimeline = useMemo(() => {
    const timeline =
      ((historyData as { timeline?: Array<Record<string, unknown>> })
        ?.timeline as Array<Record<string, unknown>> | undefined) || [];
    return timeline.filter((record) => {
      if (!categoryKey) return true;
      const definition = (record.definition || {}) as Record<string, unknown>;
      const category =
        ((definition.category || {}) as Record<string, unknown>) || {};
      return String(category.key || "") === categoryKey;
    });
  }, [categoryKey, historyData]);

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
      { key: newCategoryKey.trim(), name: newCategoryName.trim() },
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
    updateSelections.mutate({ items: [{ definitionId, isTracked }] });
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
      <MetricsHistoryCard
        title={title}
        loading={loadingHistory}
        filteredTimeline={filteredTimeline}
        emptyHistoryMessage={emptyHistoryMessage}
      />

      {showTracking && (
        <MetricsTrackingCard
          loading={loadingCategories || loadingSelected}
          readOnly={readOnly}
          categories={categories}
          selectionMap={selectionMap}
          emptyDefinitionsMessage={emptyDefinitionsMessage}
          onToggleTracked={onToggleTracked}
          isPending={updateSelections.isPending}
        />
      )}

      {showConfiguration && !readOnly && (
        <MetricsConfigurationCard
          categories={categories}
          newCategoryKey={newCategoryKey}
          newCategoryName={newCategoryName}
          definitionCategoryId={definitionCategoryId}
          newDefinitionKey={newDefinitionKey}
          newDefinitionLabel={newDefinitionLabel}
          newDefinitionType={newDefinitionType}
          newDefinitionUnit={newDefinitionUnit}
          newDefinitionTracked={newDefinitionTracked}
          createCategoryPending={createCategory.isPending}
          createDefinitionPending={createDefinition.isPending}
          onNewCategoryKeyChange={setNewCategoryKey}
          onNewCategoryNameChange={setNewCategoryName}
          onDefinitionCategoryIdChange={setDefinitionCategoryId}
          onNewDefinitionKeyChange={setNewDefinitionKey}
          onNewDefinitionLabelChange={setNewDefinitionLabel}
          onNewDefinitionTypeChange={setNewDefinitionType}
          onNewDefinitionUnitChange={setNewDefinitionUnit}
          onNewDefinitionTrackedChange={setNewDefinitionTracked}
          onAddCategory={onAddCategory}
          onAddDefinition={onAddDefinition}
        />
      )}

      {showRecording && !readOnly && (
        <MetricsRecordCard
          categoryKey={categoryKey}
          flatDefinitions={flatDefinitions}
          valueDefinitionId={valueDefinitionId}
          valueInput={valueInput}
          isPending={recordValue.isPending}
          onValueDefinitionIdChange={setValueDefinitionId}
          onValueInputChange={setValueInput}
          onRecordValue={onRecordValue}
        />
      )}
    </div>
  );
}
