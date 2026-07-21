import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@workspace/ui/components";


interface ExcelImportingStepProps {
  progress: number;
  totalRows: number;
}

export const ExcelImportingStep = ({
  progress,
  totalRows,
}: ExcelImportingStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-5 w-5" />
          Importing Patients
        </CardTitle>
        <CardDescription>
          Please wait while we import your data…
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          Processing {totalRows} records…
        </p>
      </CardContent>
    </Card>
  );
};
