// jscpd:ignore-start
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from "@workspace/ui/components";
import type { MetricCategoryResponse } from "@workspace/types";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { metricValueTypeSchema, type MetricValueType } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

interface MetricsConfigurationCardProps {
// jscpd:ignore-end
  categories: MetricCategoryResponse[];
  newCategoryKey: string;
  newCategoryName: string;
  definitionCategoryId: string;
  newDefinitionKey: string;
  newDefinitionLabel: string;
  newDefinitionType: MetricValueType;
  newDefinitionUnit: string;
  newDefinitionTracked: boolean;
  createCategoryPending: boolean;
  createDefinitionPending: boolean;
  onNewCategoryKeyChange: (v: string) => void;
  onNewCategoryNameChange: (v: string) => void;
  onDefinitionCategoryIdChange: (v: string) => void;
  onNewDefinitionKeyChange: (v: string) => void;
  onNewDefinitionLabelChange: (v: string) => void;
  onNewDefinitionTypeChange: (v: MetricValueType) => void;
  onNewDefinitionUnitChange: (v: string) => void;
  onNewDefinitionTrackedChange: (v: boolean) => void;
  onAddCategory: () => void;
  onAddDefinition: () => void;
}

/**
 * Phase 3 (per-feature): apps/app Patients > Metrics configuration card.
 * 6 literals converted to useTranslations("Patients.metricsConfiguration").
 */
function useMetricsConfigTranslations() {
  return useTranslations("Patients.metricsConfiguration");
}

export function MetricsConfigurationCard({
  categories,
  newCategoryKey,
  newCategoryName,
  definitionCategoryId,
  newDefinitionKey,
  newDefinitionLabel,
  newDefinitionType,
  newDefinitionUnit,
  newDefinitionTracked,
  createCategoryPending,
  createDefinitionPending,
  onNewCategoryKeyChange,
  onNewCategoryNameChange,
  onDefinitionCategoryIdChange,
  onNewDefinitionKeyChange,
  onNewDefinitionLabelChange,
  onNewDefinitionTypeChange,
  onNewDefinitionUnitChange,
  onNewDefinitionTrackedChange,
  onAddCategory,
  onAddDefinition,
}: MetricsConfigurationCardProps) {
  const t = useMetricsConfigTranslations();
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          {t("cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-sm">{t("newCategoryLabel")}</Label>
          <Input
            placeholder={t("categoryKeyPlaceholder")}
            value={newCategoryKey}
            onChange={(event) => onNewCategoryKeyChange(event.target.value)}
          />
          <Input
            placeholder={t("categoryNamePlaceholder")}
            value={newCategoryName}
            onChange={(event) => onNewCategoryNameChange(event.target.value)}
          />
          <Button
            onClick={onAddCategory}
            disabled={createCategoryPending}
            type="button"
          >
            {t("addCategoryButton")}
          </Button>
        </div>

        <div className="space-y-3">
          <Label className="text-sm">{t("newFieldLabel")}</Label>
          <Select
            value={definitionCategoryId}
            onValueChange={onDefinitionCategoryIdChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name || t("unnamedCategoryFallback")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t("fieldKeyPlaceholder")}
            value={newDefinitionKey}
            onChange={(event) => onNewDefinitionKeyChange(event.target.value)}
          />
          <Input
            placeholder={t("fieldLabelPlaceholder")}
            value={newDefinitionLabel}
            onChange={(event) => onNewDefinitionLabelChange(event.target.value)}
          />
          <Select
            value={newDefinitionType}
            onValueChange={(value) => {
              const nextType = parseStringEnumMember(
                metricValueTypeSchema.options,
                value,
              );
              if (nextType) onNewDefinitionTypeChange(nextType);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("valueTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">{t("valueTypeText")}</SelectItem>
              <SelectItem value="NUMBER">{t("valueTypeNumber")}</SelectItem>
              <SelectItem value="BOOLEAN">{t("valueTypeBoolean")}</SelectItem>
              <SelectItem value="DATE">{t("valueTypeDate")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={t("unitPlaceholder")}
            value={newDefinitionUnit}
            onChange={(event) => onNewDefinitionUnitChange(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newDefinitionTracked}
              onCheckedChange={(value) =>
                onNewDefinitionTrackedChange(Boolean(value))
              }
            />
            {t("trackByDefaultLabel")}
          </label>
          <Button
            onClick={onAddDefinition}
            disabled={createDefinitionPending}
            type="button"
          >
            {t("addCustomFieldButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
