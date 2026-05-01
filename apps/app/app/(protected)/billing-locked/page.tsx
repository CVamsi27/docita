"use client";

import { LockKeyhole } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { SupportContact } from "@/components/common/support-contact";

export default function BillingLockedPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-12">
      <DocitaLogo />
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <LockKeyhole className="h-6 w-6 shrink-0" aria-hidden />
            <CardTitle className="text-xl">Workspace access paused</CardTitle>
          </div>
          <CardDescription className="text-base">
            Your organization&apos;s subscription billing must be resolved before
            staff accounts can use Docita again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Please contact an organization administrator or billing owner. They
            can sign in and renew or update payment under Settings, Subscription.
          </p>
          <p className="text-xs text-foreground">
            If you believe this is a mistake, use Help and support in Settings
            (when you can sign in), or contact Docita directly:
          </p>
          <SupportContact layout="stack" variant="footer" className="text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}
