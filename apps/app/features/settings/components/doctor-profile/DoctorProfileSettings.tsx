"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/lib/auth-context";
import { useAPIQuery } from "@/lib/api-core";
import type { User } from "@workspace/types";
import { SignatureUploadQR } from "@/features/settings/components/signature-upload-qr";
import Link from "next/link";
import { CheckCircle2, PenLine } from "lucide-react";

export function DoctorProfileSettings() {
  const { user } = useAuth();

  const { data: doctorProfile } = useAPIQuery<User>(
    ["doctor-profile", user?.id ?? ""],
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const profile = doctorProfile ?? user;
  const hasSignature = !!profile?.signatureUrl;
  const hasRegistration = !!profile?.registrationNumber;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Digital Signature</CardTitle>
              <CardDescription>
                Your signature appears on prescriptions and medical documents.
              </CardDescription>
            </div>
            {hasSignature && (
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Uploaded
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSignature && profile?.signatureUrl && (
            <div className="rounded-lg border bg-white p-4 flex items-center justify-center min-h-[100px]">
              <img
                src={profile.signatureUrl}
                alt="Your current signature"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
          )}
          {!hasSignature && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <PenLine className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No signature uploaded yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your signature to generate prescriptions.
              </p>
            </div>
          )}
          <SignatureUploadQR />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Medical Registration Number
              </CardTitle>
              <CardDescription>
                Your council registration number for regulatory compliance.
              </CardDescription>
            </div>
            {hasRegistration && (
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasRegistration ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Registration Number
              </span>
              <span className="font-mono text-sm font-medium text-foreground">
                {profile?.registrationNumber}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">Not provided.</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/verify-doctor">Add Registration Number</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
