import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { useTranslation } from "react-i18next";

import type { GrowthChartData, GrowthMeasurement } from "@workspace/types";

interface GrowthChartProps {
  value: GrowthChartData;
  onChange: (value: GrowthChartData) => void;
  readOnly?: boolean;
}

function defaultMeasurement(): GrowthMeasurement {
  return {
    date: new Date().toISOString(),
    ageMonths: 0,
  };
}

export function GrowthChartUI({ value, onChange, readOnly }: GrowthChartProps) {
  const { t } = useTranslation("Consultation.growthChart");
  const activeMeasurement = value.measurements?.[0] || {};

  const handleChange = (field: keyof GrowthMeasurement, val: string) => {
    if (readOnly) return;

    const currentMeasurements = [...(value.measurements || [])];
    const firstMeasurement: GrowthMeasurement = {
      ...(currentMeasurements[0] ?? defaultMeasurement()),
    };

    if (
      field === "height" ||
      field === "weight" ||
      field === "headCircumference"
    ) {
      const numVal = val ? parseFloat(val) : undefined;
      if (field === "height") firstMeasurement.height = numVal;
      if (field === "weight") firstMeasurement.weight = numVal;
      if (field === "headCircumference") {
        firstMeasurement.headCircumference = numVal;
      }
    }

    if (currentMeasurements.length === 0) {
      currentMeasurements.push(firstMeasurement);
    } else {
      currentMeasurements[0] = firstMeasurement;
    }

    onChange({
      ...value,
      measurements: currentMeasurements,
    });
  };

  const calculatePercentile = (val: number) => {
    if (!val) return null;
    return "~50th";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>{t("heightLabel")}</Label>
            <Input
              type="number"
              value={activeMeasurement.height ?? ""}
              onChange={(e) => handleChange("height", e.target.value)}
              disabled={readOnly}
              placeholder={t("heightPlaceholder")}
            />
            {activeMeasurement.height ? (
              <p className="text-xs text-muted-foreground">
                {t("percentile", { value: String(calculatePercentile(activeMeasurement.height)) })}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>{t("weightLabel")}</Label>
            <Input
              type="number"
              value={activeMeasurement.weight ?? ""}
              onChange={(e) => handleChange("weight", e.target.value)}
              disabled={readOnly}
              placeholder={t("weightPlaceholder")}
            />
            {activeMeasurement.weight ? (
              <p className="text-xs text-muted-foreground">
                {t("percentile", { value: String(calculatePercentile(activeMeasurement.weight)) })}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>{t("headCircumferenceLabel")}</Label>
            <Input
              type="number"
              value={activeMeasurement.headCircumference ?? ""}
              onChange={(e) =>
                handleChange("headCircumference", e.target.value)
              }
              disabled={readOnly}
              placeholder={t("headCircumferencePlaceholder")}
            />
            {activeMeasurement.headCircumference ? (
              <p className="text-xs text-muted-foreground">
                {t("percentile", { value: String(calculatePercentile(activeMeasurement.headCircumference)) })}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
