import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface DBField {
  label: string;
  field: string;
  required?: boolean;
}

interface ExcelUploadStepProps {
  file: File | null;
  isUploading: boolean;
  DB_FIELDS: DBField[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export const ExcelUploadStep = ({
  file,
  isUploading,
  DB_FIELDS,
  onFileChange,
  onUpload,
}: ExcelUploadStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Excel File
        </CardTitle>
        <CardDescription>
          Select an Excel (.xlsx, .xls) or CSV file containing patient data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
            file
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
          )}
        >
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileChange}
            className="hidden"
          />
          <Label
            htmlFor="file-upload"
            className="flex cursor-pointer flex-col items-center"
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-12 w-12 text-primary" />
                <span className="mt-2 font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="mt-2 font-medium">
                  Click to upload or drag and drop
                </span>
                <span className="text-sm text-muted-foreground">
                  XLSX, XLS, or CSV (max 10MB)
                </span>
              </>
            )}
          </Label>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Expected columns</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Your file should contain columns for patient information. We&apos;ll
            automatically detect and map common column names.
          </p>
          <div className="flex flex-wrap gap-2">
            {DB_FIELDS.map((field) => (
              <Badge
                key={field.field}
                variant={field.required ? "default" : "secondary"}
              >
                {field.label}
                {field.required && " *"}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
              Analyzing File…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Preview
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
