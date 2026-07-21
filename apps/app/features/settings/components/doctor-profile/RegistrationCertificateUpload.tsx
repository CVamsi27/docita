"use client";

// jscpd:ignore-start
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { FileText, Upload, CheckCircle2 } from "lucide-react";
import { appQueryKeys } from "@workspace/data-access";
import { fetchAPI } from "@/lib/api/api-core";
import { toAbsoluteApiUrl } from "@/lib/utils/api-url";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { validateRegistrationCertificate } from "./registration-certificate-upload.helpers";
// jscpd:ignore-end

interface Props {
  doctorId: string;
  certificateUrl?: string | null;
  verificationStatus?: string;
}

export function RegistrationCertificateUpload({
  doctorId,
  certificateUrl,
  verificationStatus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const resolvedUrl = certificateUrl ? toAbsoluteApiUrl(certificateUrl) : null;
  const isPdf =
    !!certificateUrl &&
    certificateUrl.toLowerCase().split("?")[0]?.endsWith(".pdf");

  const handleFile = async (file: File) => {
    const validationError = validateRegistrationCertificate(file);
    if (validationError) {
      showUserFacingErrorToast(null, validationError.message, "upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await fetchAPI(`/doctors/${doctorId}/registration-certificate`, {
        method: "POST",
        body: formData,
        suppressGlobalErrorToast: true,
      });
      toast.success("Certificate uploaded — our team will review it shortly.");
      await queryClient.invalidateQueries({
        queryKey: appQueryKeys.doctorProfile.detail(doctorId),
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not upload the certificate. Please try again.",
        "upload",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const ctaLabel = certificateUrl
    ? "Replace Certificate"
    : "Upload Certificate";

  const showResubmitHint =
    verificationStatus === "REJECTED" || verificationStatus === "FAILED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Registration certificate</CardTitle>
            <CardDescription>
              Upload your council-issued registration certificate so our team
              can verify your details.
            </CardDescription>
          </div>
          {certificateUrl && (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              On file
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolvedUrl ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              {isPdf
                ? "View uploaded certificate (PDF)"
                : "View uploaded certificate"}
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No certificate uploaded yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPEG, or PNG. Max 5MB.
            </p>
          </div>
        )}

        {showResubmitHint && (
          <p className="text-xs text-muted-foreground">
            Your last submission was not verified. Upload a clearer certificate
            and our team will review it again.
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant={certificateUrl ? "outline" : "default"}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading…" : ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
