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
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Users,
  XCircle,
} from "lucide-react";
import { ImportResult } from "../hooks/use-excel-import";
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
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
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
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
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
              <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
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
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {result.failed}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors & Duplicates */}
      {(result.errors.length > 0 || result.duplicateDetails.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.duplicateDetails.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
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
                  <XCircle className="h-4 w-4 text-red-500" />
                  Errors
                </h4>
                <div className="rounded-md border p-4 max-h-48 overflow-auto bg-muted/50">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-sm text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
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
