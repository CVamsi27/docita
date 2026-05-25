import {
  type PatientMetricsHistoryUIProps,
} from "./patient-metrics-history-helpers";
import { usePatientMetricsUI } from "./use-patient-metrics-ui";
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
  const ui = usePatientMetricsUI(patientId, categoryKey);

  return (
    <div className={className}>
      <MetricsHistoryCard
        title={title}
        loading={ui.loadingHistory}
        filteredTimeline={ui.filteredTimeline}
        emptyHistoryMessage={emptyHistoryMessage}
      />

      {showTracking && (
        <MetricsTrackingCard
          loading={ui.loadingCategories || ui.loadingSelected}
          readOnly={readOnly}
          categories={ui.categories}
          selectionMap={ui.selectionMap}
          emptyDefinitionsMessage={emptyDefinitionsMessage}
          onToggleTracked={ui.onToggleTracked}
          isPending={ui.updateSelections.isPending}
        />
      )}

      {showConfiguration && !readOnly && (
        <MetricsConfigurationCard
          categories={ui.categories}
          newCategoryKey={ui.newCategoryKey}
          newCategoryName={ui.newCategoryName}
          definitionCategoryId={ui.definitionCategoryId}
          newDefinitionKey={ui.newDefinitionKey}
          newDefinitionLabel={ui.newDefinitionLabel}
          newDefinitionType={ui.newDefinitionType}
          newDefinitionUnit={ui.newDefinitionUnit}
          newDefinitionTracked={ui.newDefinitionTracked}
          createCategoryPending={ui.createCategory.isPending}
          createDefinitionPending={ui.createDefinition.isPending}
          onNewCategoryKeyChange={ui.setNewCategoryKey}
          onNewCategoryNameChange={ui.setNewCategoryName}
          onDefinitionCategoryIdChange={ui.setDefinitionCategoryId}
          onNewDefinitionKeyChange={ui.setNewDefinitionKey}
          onNewDefinitionLabelChange={ui.setNewDefinitionLabel}
          onNewDefinitionTypeChange={ui.setNewDefinitionType}
          onNewDefinitionUnitChange={ui.setNewDefinitionUnit}
          onNewDefinitionTrackedChange={ui.setNewDefinitionTracked}
          onAddCategory={ui.onAddCategory}
          onAddDefinition={ui.onAddDefinition}
        />
      )}

      {showRecording && !readOnly && (
        <MetricsRecordCard
          categoryKey={categoryKey}
          flatDefinitions={ui.flatDefinitions}
          valueDefinitionId={ui.valueDefinitionId}
          valueInput={ui.valueInput}
          isPending={ui.recordValue.isPending}
          onValueDefinitionIdChange={ui.setValueDefinitionId}
          onValueInputChange={ui.setValueInput}
          onRecordValue={ui.onRecordValue}
        />
      )}
    </div>
  );
}
