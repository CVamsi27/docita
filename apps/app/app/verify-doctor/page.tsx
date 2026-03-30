'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  ImageIcon,
  Loader2,
  Pencil,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useAPIQuery, useAPIMutation } from '@/lib/api-core';
import { SignaturePad, SignaturePreview } from '@/components/signature-canvas';
import {
  useGenerateSignatureToken,
  uploadSignature,
} from '@/hooks/api/use-signature-upload';
import type { User } from '@workspace/types';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { DocitaLogo } from '@workspace/ui/components/docita-logo';
import Image from 'next/image';

export default function VerifyDoctorPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isSavingReg, setIsSavingReg] = useState(false);

  // Signature state
  const [uploadMethod, setUploadMethod] = useState<'draw' | 'upload'>('draw');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: doctorProfile, isLoading, refetch } = useAPIQuery<User>(
    ['doctor-profile', user?.id ?? ''],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const updateDoctor = useAPIMutation<User, { registrationNumber: string }>(
    `/doctors/${user?.id}`,
    'PUT',
    { invalidateKeys: [['doctor-profile', user?.id ?? '']] },
  );

  const generateToken = useGenerateSignatureToken();

  const hasSignature = !!doctorProfile?.signatureUrl;
  const hasRegistration = !!doctorProfile?.registrationNumber;
  const canContinue = hasSignature && hasRegistration;

  const handleSaveRegistration = async () => {
    if (!registrationNumber.trim()) return;
    setIsSavingReg(true);
    try {
      await updateDoctor.mutateAsync({ registrationNumber: registrationNumber.trim() });
      await refetch();
      toast.success('Registration number saved.');
    } catch {
      toast.error('Failed to save registration number.');
    } finally {
      setIsSavingReg(false);
    }
  };

  const handleContinue = async () => {
    await refreshUser();
    router.replace('/dashboard');
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSignatureUpload = async (file: File) => {
    setIsUploadingSignature(true);
    try {
      const tokenData = await generateToken.mutateAsync();
      await uploadSignature(tokenData.token, file);
      await refetch();
      toast.success('Signature uploaded successfully.');
    } catch {
      toast.error('Failed to upload signature. Please try again.');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must not exceed 5MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = [
    {
      label: 'Upload Digital Signature',
      description: 'Required to generate prescriptions and medical documents.',
      done: hasSignature,
      required: true,
    },
    {
      label: 'Medical Registration Number',
      description: 'Your council registration number for verification.',
      done: hasRegistration,
      required: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <DocitaLogo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Profile Verification</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete your profile before accessing the dashboard. This ensures
              patient safety and regulatory compliance.
            </p>
          </div>

          {/* Progress */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-xs text-muted-foreground">
                {completedCount} of {steps.filter((s) => s.required).length} required
              </span>
            </div>
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.label} className="flex items-start gap-3">
                  {step.done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-primary' : ''}`}>
                      {step.label}
                      {step.required && !step.done && (
                        <span className="ml-1 text-xs font-normal text-destructive">Required</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Signature */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              {hasSignature ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <h2 className="font-semibold text-sm">Step 1: Upload Your Signature</h2>
            </div>
            {hasSignature ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Signature uploaded successfully.
              </div>
            ) : (
              <Tabs
                value={uploadMethod}
                onValueChange={(v) => setUploadMethod(v as 'draw' | 'upload')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw">
                    <Pencil className="mr-2 h-4 w-4" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Upload Image
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-3 pt-1">
                  {!signatureDataUrl ? (
                    <SignaturePad onSave={(dataUrl) => setSignatureDataUrl(dataUrl)} />
                  ) : (
                    <div className="space-y-3">
                      <SignaturePreview
                        dataUrl={signatureDataUrl}
                        onEdit={() => setSignatureDataUrl(null)}
                      />
                      <Button
                        onClick={() =>
                          handleSignatureUpload(
                            dataURLtoFile(signatureDataUrl, 'signature.png'),
                          )
                        }
                        disabled={isUploadingSignature}
                        className="w-full"
                      >
                        {isUploadingSignature ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Save Signature
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upload" className="space-y-3 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {!previewUrl ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Select Image
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-white p-4">
                        <Image
                          src={previewUrl}
                          alt="Signature preview"
                          width={400}
                          height={120}
                          className="mx-auto max-h-32 object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSignatureUpload(selectedFile!)}
                          disabled={isUploadingSignature}
                          className="flex-1"
                        >
                          {isUploadingSignature ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Save Signature
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleResetFile}>
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WebP. Max 5MB.
                  </p>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Step 2: Registration Number */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              {hasRegistration ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <h2 className="font-semibold text-sm">
                Step 2: Medical Registration Number
              </h2>
            </div>
            {hasRegistration ? (
              <p className="text-sm text-muted-foreground">
                Saved:{' '}
                <span className="font-medium text-foreground">
                  {doctorProfile?.registrationNumber}
                </span>
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="registration-number" className="text-xs text-muted-foreground">
                  Enter your medical council registration number
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="registration-number"
                    placeholder="e.g. MH-12345"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!registrationNumber.trim() || isSavingReg}
                    onClick={handleSaveRegistration}
                  >
                    {isSavingReg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="w-full"
              disabled={!canContinue}
              onClick={handleContinue}
            >
              Continue to Dashboard
            </Button>
          </div>
          {!canContinue && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all required steps to continue.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
