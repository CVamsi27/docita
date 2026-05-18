"use client";

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
import { type MetricValueType } from "./patient-metrics-history-helpers";

export function usePatientMetricsUI(
  patientId: string,
  categoryKey?: string,
) {
  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: categoriesData, isLoading: loadingCategories } =
    usePatientMetricCategories(patientId);
  const { data: historyData, isLoading: loadingHistory } =
    usePatientMetricHistory(patientId);
  const { data: selectedData, isLoading: loadingSelected } =
    usePatientSelectedMetrics(patientId);

  // ── Mutations ────────────────────────────────────────────────────────────
  const createCategory = useCreatePatientMetricCategory(patientId);
  const createDefinition = useCreatePatientMetricDefinition(patientId);
  const updateSelections = useUpdatePatientSelectedMetrics(patientId);
  const recordValue = useRecordPatientMetricValue(patientId);

  // ── Add-category form state ──────────────────────────────────────────────
  const [newCategoryKey, setNewCategoryKey] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // ── Add-definition form state ────────────────────────────────────────────
  const [definitionCategoryId, setDefinitionCategoryId] = useState("");
  const [newDefinitionKey, setNewDefinitionKey] = useState("");
  const [newDefinitionLabel, setNewDefinitionLabel] = useState("");
  const [newDefinitionType, setNewDefinitionType] =
    useState<MetricValueType>("TEXT");
  const [newDefinitionUnit, setNewDefinitionUnit] = useState("");
  const [newDefinitionTracked, setNewDefinitionTracked] = useState(true);

  // ── Record-value form state ──────────────────────────────────────────────
  const [valueDefinitionId, setValueDefinitionId] = useState("");
  const [valueInput, setValueInput] = useState("");

  // ── Derived data ─────────────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onAddCategory = () => {
    if (!newCategoryKey.trim() || !newCategoryName.trim()) return;
    createCategory.mutate(
      { key: newCategoryKey.trim(), name: newCategoryName.trim() },
      { onSuccess: () => { setNewCategoryKey(""); setNewCategoryName(""); } },
    );
  };

  const onAddDefinition = () => {
    if (!definitionCategoryId || !newDefinitionKey.trim() || !newDefinitionLabel.trim()) return;
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
    const definition = flatDefinitions.find((item) => item.id === valueDefinitionId);
    if (!definition) return;

    if (definition.valueType === "NUMBER") {
      const numberValue = Number(valueInput);
      if (!Number.isFinite(numberValue)) return;
      recordValue.mutate({ definitionId: valueDefinitionId, valueNumber: numberValue, source: "MANUAL" });
      setValueInput("");
      return;
    }
    if (definition.valueType === "BOOLEAN") {
      recordValue.mutate({ definitionId: valueDefinitionId, valueBoolean: valueInput.toLowerCase() === "true", source: "MANUAL" });
      setValueInput("");
      return;
    }
    recordValue.mutate({ definitionId: valueDefinitionId, valueString: valueInput, source: "MANUAL" });
    setValueInput("");
  };

  return {
    // loading flags
    loadingCategories,
    loadingHistory,
    loadingSelected,
    // derived data
    categories,
    selectionMap,
    filteredTimeline,
    flatDefinitions,
    // mutations (for isPending flags)
    createCategory,
    createDefinition,
    updateSelections,
    recordValue,
    // add-category form
    newCategoryKey, setNewCategoryKey,
    newCategoryName, setNewCategoryName,
    // add-definition form
    definitionCategoryId, setDefinitionCategoryId,
    newDefinitionKey, setNewDefinitionKey,
    newDefinitionLabel, setNewDefinitionLabel,
    newDefinitionType, setNewDefinitionType,
    newDefinitionUnit, setNewDefinitionUnit,
    newDefinitionTracked, setNewDefinitionTracked,
    // record-value form
    valueDefinitionId, setValueDefinitionId,
    valueInput, setValueInput,
    // handlers
    onAddCategory,
    onAddDefinition,
    onToggleTracked,
    onRecordValue,
  };
}
