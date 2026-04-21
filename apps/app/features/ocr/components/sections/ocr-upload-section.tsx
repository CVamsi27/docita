import Image from "next/image";
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
              <div className="relative w-full h-[300px]">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
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
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onStartMobileUpload}
              className="w-full"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Upload from Mobile
            </Button>

            <Button
              type="button"
              onClick={onScan}
              disabled={!file || isScanning}
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  {scanned ? "Re-scan" : "Scan Document"}
                </>
              )}
            </Button>
          </div>

          {file && (
            <p className="text-xs text-muted-foreground truncate">
              Selected file: {file.name}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="surface-info">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Ensure good lighting and clear handwriting</li>
              <li>Capture the entire page including headers</li>
              <li>Avoid shadows and blur</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
