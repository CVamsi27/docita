import { Activity, Heart, Thermometer, Weight } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { smartTemperatureToFahrenheit } from "@workspace/utils";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import type { VitalsData } from "@/features/patients/rules/vitalsRules";

interface PatientVitalsBannerUIProps {
  vitals: VitalsData;
  date: string;
  bmi: string | null;
  bmiStatus: { label: string; color: string } | null;
}

export function PatientVitalsBannerUI({
  vitals,
  date,
  bmi,
  bmiStatus,
}: PatientVitalsBannerUIProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Activity className="h-3 w-3" /> BP
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">
                {vitals.bloodPressure || "--/--"}
              </span>
              <span className="text-xs text-muted-foreground">mmHg</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Heart className="h-3 w-3" /> Pulse
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{vitals.pulse || "--"}</span>
              <span className="text-xs text-muted-foreground">bpm</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temp
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">
                {vitals.temperature
                  ? `${smartTemperatureToFahrenheit(vitals.temperature)}°F`
                  : "--"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Weight className="h-3 w-3" /> BMI / Wt
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold">{bmi || "--"}</span>
              <span className={cn("text-xs font-medium", bmiStatus?.color)}>
                {bmiStatus?.label ||
                  (vitals.weight ? `${vitals.weight} kg` : "")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
