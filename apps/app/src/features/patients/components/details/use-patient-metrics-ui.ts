import { useMemo, useState } from "react";
import {
  useCreatePatientMetricCategory,
  useCreatePatientMetricDefinition,
  usePatientMetricCategories,
  usePatientMetricHistory,
  usePatientSelectedMetrics,
  useRecordPatientMetricValue,
  useUpdatePatientSelectedMetrics,
} from "@workspace/data-access";
import {
  buildMetricSelectionMap,
  filterMetricCategories,
  filterMetricTimeline,
  flattenMetricDefinitions,
  type MetricValueType,
} from "./patient-metrics-history-helpers";

export function usePatientMetricsUI(patientId: string, categoryKey?: string) {
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
    () => filterMetricCategories(categoriesData, categoryKey),
    [categoriesData, categoryKey],
  );

  const selectionMap = useMemo(
    () => buildMetricSelectionMap(selectedData),
    [selectedData],
  );

  const filteredTimeline = useMemo(
    () => filterMetricTimeline(historyData, categoryKey),
    [categoryKey, historyData],
  );

  const flatDefinitions = useMemo(
    () => flattenMetricDefinitions(categories),
    [categories],
  );

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
    )
      return;
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

  return {
    loadingCategories,
    loadingHistory,
    loadingSelected,
    categories,
    selectionMap,
    filteredTimeline,
    flatDefinitions,
    createCategory,
    createDefinition,
    updateSelections,
    recordValue,
    newCategoryKey,
    setNewCategoryKey,
    newCategoryName,
    setNewCategoryName,
    definitionCategoryId,
    setDefinitionCategoryId,
    newDefinitionKey,
    setNewDefinitionKey,
    newDefinitionLabel,
    setNewDefinitionLabel,
    newDefinitionType,
    setNewDefinitionType,
    newDefinitionUnit,
    setNewDefinitionUnit,
    newDefinitionTracked,
    setNewDefinitionTracked,
    valueDefinitionId,
    setValueDefinitionId,
    valueInput,
    setValueInput,
    onAddCategory,
    onAddDefinition,
    onToggleTracked,
    onRecordValue,
  };
}
