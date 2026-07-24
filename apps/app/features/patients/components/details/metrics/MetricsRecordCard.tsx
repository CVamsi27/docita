// jscpd:ignore-start
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from "@workspace/ui/components";
import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface FlatDefinition {
// jscpd:ignore-end
  id: string;
  label: string;
  valueType: string;
}

interface MetricsRecordCardProps {
  categoryKey?: string;
  flatDefinitions: FlatDefinition[];
  valueDefinitionId: string;
  valueInput: string;
  isPending: boolean;
  onValueDefinitionIdChange: (id: string) => void;
  onValueInputChange: (value: string) => void;
  onRecordValue: () => void;
}

export function MetricsRecordCard({
  categoryKey,
  flatDefinitions,
  valueDefinitionId,
  valueInput,
  isPending,
  onValueDefinitionIdChange,
  onValueInputChange,
  onRecordValue,
}: MetricsRecordCardProps) {
  const t = useTranslations("Patients.metrics");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5 text-primary" />
          {categoryKey === "vitals" ? t("recordVitals") : t("recordMetric")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] items-end">
        <div className="space-y-2">
          <Label>{t("metricLabel")}</Label>
          <Select value={valueDefinitionId} onValueChange={onValueDefinitionIdChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("metricPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {flatDefinitions.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  {t("noMetricsAvailable")}
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
          <Label>{t("valueLabel")}</Label>
          <Input
            placeholder={t("valuePlaceholder")}
            value={valueInput}
            onChange={(event) => onValueInputChange(event.target.value)}
          />
        </div>
        <Button type="button" onClick={onRecordValue} disabled={isPending}>
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
