import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AlertCircle, Check, CheckCircle2, Users, XCircle } from "lucide-react";
import { ImportResult } from "@/features/excel/hooks/use-excel-import";
import { useRouter } from "next/navigation";

interface ExcelResultsStepProps {
  result: ImportResult;
  onReset: () => void;
}

export const ExcelResultsStep = ({
  result,
  onReset,
}: ExcelResultsStepProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-info/15 p-3">
                <Users className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/15 p-3">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {result.success}
                </p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/15 p-3">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {result.duplicates}
                </p>
                <p className="text-sm text-muted-foreground">Duplicates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-destructive/15 p-3">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {result.failed}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      {(result.errors.length > 0 || result.duplicateDetails.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.duplicateDetails.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Duplicates Skipped
                </h4>
                <div className="rounded-md border max-h-48 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Existing Patient</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.duplicateDetails.map((dup, i) => (
                        <TableRow key={i}>
                          <TableCell>{dup.row}</TableCell>
                          <TableCell>{dup.reason}</TableCell>
                          <TableCell>
                            {dup.existingPatient
                              ? `${dup.existingPatient.name} (${dup.existingPatient.phone})`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Errors
                </h4>
                <div className="rounded-md border p-4 max-h-48 overflow-auto bg-muted/50">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {}
      <div className="flex gap-4">
        <Button onClick={() => router.push("/patients")}>
          <Check className="mr-2 h-4 w-4" />
          View Patients
        </Button>
        <Button variant="outline" onClick={onReset}>
          Import More
        </Button>
      </div>
    </div>
  );
};
