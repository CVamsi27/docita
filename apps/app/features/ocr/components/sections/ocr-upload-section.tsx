import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { AlertCircle, Scan, Smartphone, Upload } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

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
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/40 p-10 transition-colors duration-150 hover:bg-muted/50 relative overflow-hidden">
            {previewUrl ? (
              <div className="relative h-[300px] w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 40vw, 100vw"
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

          <div className="relative z-10 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={onStartMobileUpload}
              className="w-full min-w-0"
            >
              <Smartphone className="h-4 w-4 mr-2 shrink-0" />
              <span className="min-w-0 truncate">Upload from Mobile</span>
            </Button>

            {file ? (
              <Button
                type="button"
                onClick={onScan}
                disabled={isScanning}
                className="w-full min-w-0"
              >
                {isScanning ? (
                  <>
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2 shrink-0" />
                    <span className="min-w-0 truncate">
                      {scanned ? "Re-scan" : "Scan Document"}
                    </span>
                  </>
                )}
              </Button>
            ) : (
              <SymbolTooltip label="Choose a file in the upload area first">
                <div
                  className={cn(
                    "inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-xs sm:h-11",
                    "cursor-not-allowed select-none",
                  )}
                  aria-disabled="true"
                  tabIndex={0}
                >
                  <Scan className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 truncate">Scan document</span>
                </div>
              </SymbolTooltip>
            )}
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
