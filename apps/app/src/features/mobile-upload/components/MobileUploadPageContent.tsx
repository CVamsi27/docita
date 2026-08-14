import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { MobileHeader } from "@/features/mobile-upload/components/MobileHeader";
import { MobileSuccessScreen } from "@/features/mobile-upload/components/MobileSuccessScreen";
import { MobileUploadForm } from "@/features/mobile-upload/components/MobileUploadForm";
import { useMobileUpload } from "./use-mobile-upload";

const PAGE_SHELL_CLASSES =
  "min-h-screen bg-linear-to-b from-background to-card dark:from-background dark:to-card";

/**
 * Mobile scan-and-upload screen reached via QR code from the desktop app.
 * Session/file/mutation state lives in `useMobileUpload`; the scan form's
 * fields and submit button live in `MobileUploadForm` — this component just
 * picks which screen (success / incomplete-link / form) to render.
 */
function MobileUploadPageInner() {
  const { t } = useTranslation("MobileUpload");
  const upload = useMobileUpload();

  if (upload.success) return <MobileSuccessScreen />;

  if (!upload.uploadSecretFromQuery?.trim()) {
    return (
      <div className={PAGE_SHELL_CLASSES}>
        <MobileHeader />
        <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t("incompleteLinkError")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_SHELL_CLASSES}>
      <MobileHeader />
      <MobileUploadForm
        file={upload.file}
        previewUrl={upload.previewUrl}
        errorMessage={upload.errorMessage}
        isUploading={upload.isUploading}
        onFileSelect={upload.handleFileSelect}
        onUpload={upload.handleUpload}
      />
    </div>
  );
}

export default function MobileUploadPage() {
  const { t } = useTranslation("MobileUpload");
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 p-4"
          role="status"
          aria-live="polite"
          aria-label="Loading upload"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-10 w-10 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      }
    >
      <MobileUploadPageInner />
    </Suspense>
  );
}
