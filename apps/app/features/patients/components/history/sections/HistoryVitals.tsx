import { Activity } from "lucide-react";
import { smartTemperatureToFahrenheit } from "@workspace/utils";

interface VitalSigns {
  height?: number;
  weight?: number;
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  spo2?: number;
}

export function HistoryVitals({ vitalSign }: { vitalSign: VitalSigns }) {
  if (!vitalSign) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Activity className="h-4 w-4 text-green-600" />
        Vital Signs
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {vitalSign.height && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Height</p>
            <p className="text-sm font-medium">{vitalSign.height} cm</p>
          </div>
        )}
        {vitalSign.weight && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Weight</p>
            <p className="text-sm font-medium">{vitalSign.weight} kg</p>
          </div>
        )}
        {vitalSign.bloodPressure && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">BP</p>
            <p className="text-sm font-medium">{vitalSign.bloodPressure}</p>
          </div>
        )}
        {vitalSign.pulse && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Pulse</p>
            <p className="text-sm font-medium">{vitalSign.pulse} bpm</p>
          </div>
        )}
        {vitalSign.temperature && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="text-sm font-medium">
              {smartTemperatureToFahrenheit(vitalSign.temperature)}°F
            </p>
          </div>
        )}
        {vitalSign.spo2 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">SpO2</p>
            <p className="text-sm font-medium">{vitalSign.spo2}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
