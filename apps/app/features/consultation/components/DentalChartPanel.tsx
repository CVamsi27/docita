import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Smile } from "lucide-react";
import { DentalChartUI, type DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";

interface DentalChartPanelProps {
  selectedAppointmentId: string | null;
  selectedPatient: { id?: string } | null;
  chartData: DentalChartValue;
  onChartChange: (value: DentalChartValue) => void;
}

export function DentalChartPanel({
  selectedAppointmentId,
  selectedPatient,
  chartData,
  onChartChange,
}: DentalChartPanelProps) {
  if (selectedAppointmentId) {
    return <DentalChartUI value={chartData} onChange={onChartChange} />;
  }

  return (
    <Card className="ui-card-surface h-full min-h-[400px] flex items-center justify-center">
      <CardContent className="text-center space-y-2 py-12">
        <Smile className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {selectedPatient
            ? "Select an appointment to view the dental chart"
            : "Search for a patient to get started"}
        </p>
      </CardContent>
    </Card>
  );
}
