"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";

export function ContactSectionVerification({
  c,
  requiredMark,
}: {
  c: PublicBookingPageController;
  requiredMark: ReactNode;
}) {
  return (
    <div className="space-y-3 sm:col-span-2">
      {c.requiresOtp === false ? (
        <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-muted/25 text-left shadow-sm">
          <AlertTitle className="text-[length:var(--fs-sm)]">
            New to booking here online
          </AlertTitle>
          <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
            We did not find an existing chart for this phone number at this
            location yet. Submit your request and staff will confirm your visit.
          </AlertDescription>
        </Alert>
      ) : null}

      {c.requiresOtp ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-primary/35 bg-gradient-to-br from-primary/[0.07] to-card p-4 shadow-sm">
          <div className="space-y-1">
            <MicroLabel as="p" className="mt-0">
              Verify your phone
            </MicroLabel>
            <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              This phone matches records at this location. Request a one-time
              code via WhatsApp, then enter it so we can show your recent
              visits.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 justify-start px-2 text-[length:var(--fs-xs)] text-muted-foreground"
              onClick={() => {
                c.setRequiresOtp(false);
                c.setVerificationToken(null);
                c.setOtp("");
                c.setSubmitFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.bookingVerificationToken;
                  return next;
                });
              }}
            >
              New patient / can&apos;t receive WhatsApp? Continue without code
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-[var(--radius-md)] border-primary/35 bg-background/95 shadow-sm transition-colors duration-150 hover:border-primary/50 hover:bg-background sm:h-11"
            onClick={() => void c.handleRequestOtp()}
            disabled={c.otpRequest.isPending}
          >
            Send code to WhatsApp
          </Button>
          <div className="grid gap-2">
            <Label
              htmlFor="pb-otp"
              className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
            >
              Verification code{requiredMark}
            </Label>
            <Input
              id="pb-otp"
              value={c.otp}
              onChange={(e) => {
                c.setOtp(e.target.value);
                c.setSubmitFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.bookingVerificationToken;
                  return next;
                });
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-invalid={
                c.submitFieldErrors.bookingVerificationToken ? true : undefined
              }
              aria-describedby={
                c.submitFieldErrors.bookingVerificationToken
                  ? "pb-otp-error"
                  : undefined
              }
            />
            {c.submitFieldErrors.bookingVerificationToken ? (
              <p
                id="pb-otp-error"
                role="alert"
                className="text-[length:var(--fs-xs)] leading-snug text-destructive"
              >
                {c.submitFieldErrors.bookingVerificationToken}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold sm:h-11"
            onClick={() => void c.handleVerifyOtp()}
            disabled={c.otpVerify.isPending || c.otp.length < 4}
          >
            Verify and continue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
