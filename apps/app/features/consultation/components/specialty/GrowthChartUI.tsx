import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { GrowthChartData, GrowthMeasurement } from "@workspace/types";

interface GrowthChartProps {
  value: GrowthChartData;
  onChange: (value: GrowthChartData) => void;
  patientAgeMinutes?: number; // Needed for accurate percentile calc
  readOnly?: boolean;
}

export function GrowthChartUI({ value, onChange, readOnly }: GrowthChartProps) {
  // Helper to extract the most recent or active measurement for editing
  // For this UI, we assume we are editing the *current* visit's measurement
  // If no measurements exist, we will create one on change.
  const activeMeasurement = value.measurements?.[0] || {};

  const handleChange = (field: keyof GrowthMeasurement, val: string) => {
    if (readOnly) return;

    // Create new array with updated first element
    const currentMeasurements = [...(value.measurements || [])];
    const firstMeasurement = {
      ...(currentMeasurements[0] || {
        date: new Date().toISOString(),
        ageMonths: 0,
      }),
    };

    // Update field
    if (
      field === "height" ||
      field === "weight" ||
      field === "headCircumference"
    ) {
      // We know these fields are numbers in the schema
      const numVal = val ? parseFloat(val) : undefined;
      if (field === "height")
        (firstMeasurement as GrowthMeasurement).height = numVal;
      if (field === "weight")
        (firstMeasurement as GrowthMeasurement).weight = numVal;
      if (field === "headCircumference")
        (firstMeasurement as GrowthMeasurement).headCircumference = numVal;
    }

    if (currentMeasurements.length === 0) {
      currentMeasurements.push(firstMeasurement as GrowthMeasurement);
    } else {
      currentMeasurements[0] = firstMeasurement as GrowthMeasurement;
    }

    onChange({
      ...value,
      measurements: currentMeasurements,
    });
  };

  // Placeholder logic for percentiles - in a real app, this would use WHO/CDC tables
  const calculatePercentile = (
    val: number,
    // type: "height" | "weight" | "head",
  ) => {
    if (!val) return null;
    return "~50th"; // Stub
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
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={activeMeasurement.height?.toString() || ""}
                onChange={(e) => handleChange("height", e.target.value)}
                readOnly={readOnly}
              />
              {activeMeasurement.height && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(Number(activeMeasurement.height))} %ile
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={activeMeasurement.weight?.toString() || ""}
                onChange={(e) => handleChange("weight", e.target.value)}
                readOnly={readOnly}
              />
              {activeMeasurement.weight && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(Number(activeMeasurement.weight))} %ile
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Head Circumference (cm)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={activeMeasurement.headCircumference?.toString() || ""}
                onChange={(e) =>
                  handleChange("headCircumference", e.target.value)
                }
                readOnly={readOnly}
              />
              {activeMeasurement.headCircumference && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(
                    Number(activeMeasurement.headCircumference),
                  )}{" "}
                  %ile
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-slate-50 flex flex-col items-center justify-center text-slate-400">
          <p className="text-sm">Interactive Growth Chart Visualization</p>
          <p className="text-xs mt-1">WHO (0-2y) / CDC (2-19y)</p>
          {/* In a real implementation, a Recharts line chart would go here */}
          <div className="w-full h-40 mt-4 border-2 border-dashed border-slate-200 rounded flex items-center justify-center">
            Chart Placeholder
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
