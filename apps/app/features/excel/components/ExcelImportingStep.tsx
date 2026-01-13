import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Loader2 } from "lucide-react";

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
          <Loader2 className="h-5 w-5 animate-spin" />
          Importing Patients
        </CardTitle>
        <CardDescription>
          Please wait while we import your data...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          Processing {totalRows} records...
        </p>
      </CardContent>
    </Card>
  );
};
