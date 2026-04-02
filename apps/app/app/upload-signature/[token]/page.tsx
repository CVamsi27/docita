"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  validateToken,
  uploadSignature,
  type UploadResult,
} from "@/hooks/api/use-signature-upload";
import { SignaturePad, SignaturePreview } from "@/components/signature-canvas";
import {
  dataUrlToFile,
  validateSignatureImageFile,
} from "@/features/_shared/utils/signature-upload";

export default function UploadSignaturePage() {
  const params = useParams();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [doctorName, setDoctorName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [uploadMethod, setUploadMethod] = useState<'draw' | 'upload'>('draw');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const validation = await validateToken(token);
        setTokenValid(true);
        setDoctorName(validation.doctor?.name ?? "");
        setValidating(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Invalid or expired token",
        );
        setTokenValid(false);
        setValidating(false);
      }
    };

    if (token) {
      checkToken();
    }
  }, [token]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateSignatureImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
  };

  const handleSignatureEdit = () => {
    setSignatureDataUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile && !signatureDataUrl) return;

    setUploading(true);
    setError(null);

    try {
      let fileToUpload: File;

      if (uploadMethod === 'draw' && signatureDataUrl) {
        fileToUpload = dataUrlToFile(signatureDataUrl, 'signature.png');
      } else if (selectedFile) {
        fileToUpload = selectedFile;
      } else {
        throw new Error('No signature to upload');
      }

      const result = await uploadSignature(token, fileToUpload);
      setUploadResult(result);
      setUploadComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Validating upload link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Invalid Upload Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="mt-4 text-sm text-muted-foreground">
              This link may have expired or been used. Please request a new
              upload link from the Docita app.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadComplete && uploadResult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle>Upload Successful!</CardTitle>
            </div>
            <CardDescription>
              Your signature has been uploaded successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-success/50 bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                Signature uploaded for <strong>{uploadResult.doctor?.name}</strong>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4">
              <Image
                src={uploadResult.signatureUrl}
                alt="Uploaded signature"
                width={300}
                height={128}
                className="mx-auto max-h-32 object-contain"
                unoptimized
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              You can now close this page. Your signature will appear on all
              prescriptions and medical documents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Your Signature</CardTitle>
          <CardDescription>
            Draw or upload a clear image of your signature for Dr. {doctorName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'draw' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">
                <Pencil className="mr-2 h-4 w-4" />
                Draw Signature
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="space-y-4">
              <Alert>
                <Pencil className="h-4 w-4" />
                <AlertDescription>
                  Draw your signature using your mouse or touch screen
                </AlertDescription>
              </Alert>

              {!signatureDataUrl ? (
                <SignaturePad
                  onSave={handleSignatureSave}
                />
              ) : (
                <div className="space-y-4">
                  <SignaturePreview
                    dataUrl={signatureDataUrl}
                    onEdit={handleSignatureEdit}
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Signature
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <Alert>
                <ImageIcon className="h-4 w-4" />
                <AlertDescription>
                  Upload a clear image of your signature (PNG, JPG, or WebP).
                  Maximum file size: 5MB.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="signature-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedFile ? "Change Image" : "Select Image"}
                  </Button>
                </div>

                {previewUrl && (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-white p-4">
                      <Image
                        src={previewUrl}
                        alt="Signature preview"
                        width={400}
                        height={192}
                        className="mx-auto max-h-48 object-contain"
                        unoptimized
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Signature
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        disabled={uploading}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
