/* eslint-disable @next/next/no-img-element */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle, Loader2, Scan, Smartphone, Upload } from "lucide-react";

interface OCRUploadSectionProps {
  previewUrl: string | null;
  file: File | null;
  isScanning: boolean;
  scanned: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartMobileUpload: () => void;
  onScan: () => void;
}

export const OCRUploadSection = ({
  previewUrl,
  file,
  isScanning,
  scanned,
  onFileChange,
  onStartMobileUpload,
  onScan,
}: OCRUploadSectionProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload Document</CardTitle>
          <CardDescription>Take a photo or upload an image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 hover:bg-muted/50 transition-colors relative overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[300px] object-contain"
              />
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2 text-center">
                  Click to upload or drag and drop
                </p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={onFileChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onStartMobileUpload}
              disabled={isScanning || scanned}
            >
              <Smartphone className="mr-2 h-4 w-4" /> Scan with Phone
            </Button>
            <Button onClick={onScan} disabled={!file || isScanning || scanned}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" />{" "}
                  {scanned ? "Rescan" : "Scan Image"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Ensure good lighting and clear handwriting.</li>
              <li>Capture the entire page including headers.</li>
              <li>Avoid shadows and blur.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
