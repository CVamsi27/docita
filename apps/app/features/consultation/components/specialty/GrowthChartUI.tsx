import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

export interface GrowthData {
  height?: string;
  weight?: string;
  headCircumference?: string;
}

interface GrowthChartProps {
  value: GrowthData;
  onChange: (value: GrowthData) => void;
  patientAgeMinutes?: number; // Needed for accurate percentile calc
  readOnly?: boolean;
}

export function GrowthChartUI({ value, onChange, readOnly }: GrowthChartProps) {
  const handleChange = (field: keyof GrowthData, val: string) => {
    if (readOnly) return;
    onChange({
      ...value,
      [field]: val,
    });
  };

  // Placeholder logic for percentiles - in a real app, this would use WHO/CDC tables
  const calculatePercentile = (
    val: number,
    type: "height" | "weight" | "head",
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
                value={value?.height || ""}
                onChange={(e) => handleChange("height", e.target.value)}
                readOnly={readOnly}
              />
              {value?.height && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(Number(value.height), "height")} %ile
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={value?.weight || ""}
                onChange={(e) => handleChange("weight", e.target.value)}
                readOnly={readOnly}
              />
              {value?.weight && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(Number(value.weight), "weight")} %ile
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Head Circumference (cm)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={value?.headCircumference || ""}
                onChange={(e) =>
                  handleChange("headCircumference", e.target.value)
                }
                readOnly={readOnly}
              />
              {value?.headCircumference && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {calculatePercentile(Number(value.headCircumference), "head")}{" "}
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
