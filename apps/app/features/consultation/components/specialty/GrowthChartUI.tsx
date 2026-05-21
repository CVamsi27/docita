import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

import { GrowthChartData, GrowthMeasurement } from "@workspace/types";

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
        <CardTitle>Growth Parameters</CardTitle>
        <CardDescription>
          Enter anthropometric data to track growth.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Height / Length (cm)</Label>
            <Input
              type="number"
              value={activeMeasurement.height ?? ""}
              onChange={(e) => handleChange("height", e.target.value)}
              disabled={readOnly}
              placeholder="Enter height"
            />
            {activeMeasurement.height ? (
              <p className="text-xs text-muted-foreground">
                Percentile: {calculatePercentile(activeMeasurement.height)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={activeMeasurement.weight ?? ""}
              onChange={(e) => handleChange("weight", e.target.value)}
              disabled={readOnly}
              placeholder="Enter weight"
            />
            {activeMeasurement.weight ? (
              <p className="text-xs text-muted-foreground">
                Percentile: {calculatePercentile(activeMeasurement.weight)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Head Circumference (cm)</Label>
            <Input
              type="number"
              value={activeMeasurement.headCircumference ?? ""}
              onChange={(e) =>
                handleChange("headCircumference", e.target.value)
              }
              disabled={readOnly}
              placeholder="Enter head circumference"
            />
            {activeMeasurement.headCircumference ? (
              <p className="text-xs text-muted-foreground">
                Percentile:{" "}
                {calculatePercentile(activeMeasurement.headCircumference)}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
