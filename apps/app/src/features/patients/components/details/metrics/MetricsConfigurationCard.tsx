// jscpd:ignore-start
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from "@workspace/ui/components";
import type { MetricCategoryResponse } from "@workspace/types";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("Patients");
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          {t("metricsConfiguration.cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-sm">{t("metricsConfiguration.newCategoryLabel")}</Label>
          <Input
            placeholder={t("metricsConfiguration.categoryKeyPlaceholder")}
            value={newCategoryKey}
            onChange={(event) => onNewCategoryKeyChange(event.target.value)}
          />
          <Input
            placeholder={t("metricsConfiguration.categoryNamePlaceholder")}
            value={newCategoryName}
            onChange={(event) => onNewCategoryNameChange(event.target.value)}
          />
          <Button
            onClick={onAddCategory}
            disabled={createCategoryPending}
            type="button"
          >
            {t("metricsConfiguration.addCategoryButton")}
          </Button>
        </div>

        <div className="space-y-3">
          <Label className="text-sm">{t("metricsConfiguration.newFieldLabel")}</Label>
          <Select
            value={definitionCategoryId}
            onValueChange={onDefinitionCategoryIdChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("metricsConfiguration.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name || t("metricsConfiguration.unnamedCategoryFallback")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t("metricsConfiguration.fieldKeyPlaceholder")}
            value={newDefinitionKey}
            onChange={(event) => onNewDefinitionKeyChange(event.target.value)}
          />
          <Input
            placeholder={t("metricsConfiguration.fieldLabelPlaceholder")}
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
              <SelectValue placeholder={t("metricsConfiguration.valueTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">{t("metricsConfiguration.valueTypeText")}</SelectItem>
              <SelectItem value="NUMBER">{t("metricsConfiguration.valueTypeNumber")}</SelectItem>
              <SelectItem value="BOOLEAN">{t("metricsConfiguration.valueTypeBoolean")}</SelectItem>
              <SelectItem value="DATE">{t("metricsConfiguration.valueTypeDate")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={t("metricsConfiguration.unitPlaceholder")}
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
            {t("metricsConfiguration.trackByDefaultLabel")}
          </label>
          <Button
            onClick={onAddDefinition}
            disabled={createDefinitionPending}
            type="button"
          >
            {t("metricsConfiguration.addCustomFieldButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
