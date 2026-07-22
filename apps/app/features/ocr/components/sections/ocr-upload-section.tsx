import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import Image from "next/image";
import { useTranslations } from "next-intl";
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

/**
 * Phase 3 (per-feature): apps/app OCR > Upload section
 * (step 1 of OCR flow: file picker + scan button + tips). 8 literals
 * converted to useTranslations("Ocr.uploadSection").
 */
function useOcrUploadTranslations() {
  return useTranslations("Ocr.uploadSection");
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
  const t = useOcrUploadTranslations();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("stepTitle")}</CardTitle>
          <CardDescription>{t("stepDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/40 p-10 transition-colors duration-150 hover:bg-muted/50 relative overflow-hidden">
            {previewUrl ? (
              <div className="relative h-[300px] w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={previewUrl}
                  alt={t("previewAlt")}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2 text-center">
                  {t("dropzonePrompt")}
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
              <span className="min-w-0 truncate">{t("uploadFromMobileButton")}</span>
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
                    {t("scanningLabel")}
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2 shrink-0" />
                    <span className="min-w-0 truncate">
                      {scanned ? t("rescanButton") : t("scanDocumentButton")}
                    </span>
                  </>
                )}
              </Button>
            ) : (
              <SymbolTooltip label={t("chooseFileFirstTooltip")}>
                <div
                  className={cn(
                    "inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-xs sm:h-11",
                    "cursor-not-allowed select-none",
                  )}
                  aria-disabled="true"
                  tabIndex={0}
                >
                  <Scan className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 truncate">{t("scanDocumentButton")}</span>
                </div>
              </SymbolTooltip>
            )}
          </div>

          {file && (
            <p className="text-xs text-muted-foreground truncate">
              {t("selectedFileLabel", { name: file.name })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="surface-info">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">{t("tipsTitle")}</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{t("tipsTip1")}</li>
              <li>{t("tipsTip2")}</li>
              <li>{t("tipsTip3")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
