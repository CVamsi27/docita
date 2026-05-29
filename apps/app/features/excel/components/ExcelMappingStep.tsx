import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { ImportPreview } from "@/features/excel/hooks/use-excel-import";

interface DBField {
  label: string;
  field: string;
  required?: boolean;
}

interface ExcelMappingStepProps {
  preview: ImportPreview;
  columnMappings: Record<string, string>;
  DB_FIELDS: DBField[];
  isImporting: boolean;
  onUpdateMapping: (excelColumn: string, dbField: string | null) => void;
  onImport: () => void;
  hasRequiredMappings: () => boolean;
}

export const ExcelMappingStep = ({
  preview,
  columnMappings,
  DB_FIELDS,
  isImporting,
  onUpdateMapping,
  onImport,
  hasRequiredMappings,
}: ExcelMappingStepProps) => {
  return (
    <div className="grid gap-6 max-lg:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Column mapping</CardTitle>
          <CardDescription>
            Map your Excel columns to database fields. Required fields are
            marked with *.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview.columns.map((col) => (
            <div
              key={col.excelColumn}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            >
              <div className="flex-1">
                <Label className="text-sm font-medium">{col.excelColumn}</Label>
                <p className="text-xs text-muted-foreground truncate">
                  e.g., {col.sampleValues.slice(0, 2).join(", ")}
                </p>
              </div>
              <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={columnMappings[col.excelColumn] || ""}
                onValueChange={(value) =>
                  onUpdateMapping(col.excelColumn, value || null)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Skip this column</SelectItem>
                  {DB_FIELDS.map((field) => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.label}
                      {field.required && " *"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex-col gap-4">
          {!hasRequiredMappings() && (
            <div className="flex items-center gap-2 text-warning text-sm w-full">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Please map both First name and Phone number (required)
              </span>
            </div>
          )}
          <Button
            onClick={onImport}
            disabled={!hasRequiredMappings() || isImporting}
            className="w-full"
          >
            <Users className="mr-2 h-4 w-4" />
            Import {preview.totalRows} patients
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data preview</CardTitle>
          <CardDescription>
            Showing first {preview.sampleData.length} rows of{" "}
            {preview.totalRows} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overscroll-x-contain rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.columns
                    .filter((c) => columnMappings[c.excelColumn])
                    .map((col) => (
                      <TableHead key={col.excelColumn}>
                        {columnMappings[col.excelColumn]}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sampleData.map((row, i) => (
                  <TableRow key={i}>
                    {preview.columns
                      .filter((c) => columnMappings[c.excelColumn])
                      .map((col) => (
                        <TableCell key={col.excelColumn}>
                          {row[col.excelColumn] || "-"}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
