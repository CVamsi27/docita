"use client";

import { UserCircle } from "lucide-react";
import {
  DPDP_NOTICE_TEXT_PATIENT,
  DPDP_NOTICE_TITLE,
} from "@workspace/types";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/indicators/card";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Input } from "@workspace/ui/components/form/input";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { Label } from "@workspace/ui/components/form/label";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  BookingSectionHeader,
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "@/features/public-booking/public-booking-components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

export function ContactSection({
  c,
  facilityWord,
  compactHeader = false,
}: {
  c: PublicBookingPageController;
  facilityWord: string;
  compactHeader?: boolean;
}) {
  const requiredMark = (
    <span aria-hidden className="text-destructive"> *</span>
  );

  const phoneChecked = c.requiresOtp !== null;
  const isNewPatient = c.requiresOtp === false;

  return (
    <Card className={cn(bookingCardClass, bookingSectionShell, "flex flex-col")}>
      <CardHeader
        className={cn(bookingSectionHeaderBar, compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5")}
      >
        <BookingSectionHeader
          icon={UserCircle}
          micro="How we reach you"
          title="Your contact details"
          description={
            <>
              Please use the same phone this {facilityWord.toLowerCase()} has on file when
              possible, so we can match your request to your chart.
            </>
          }
          tone="info"
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 sm:px-6 sm:py-6">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pb-phone" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
            Phone number{requiredMark}
          </Label>
          <Input
            id="pb-phone"
            value={c.phone}
            onChange={(e) => {
              c.setPhone(e.target.value);
              c.setRequiresOtp(null);
              c.setVerificationToken(null);
              c.setDateOfBirth("");
              c.setFirstName("");
              c.setLastName("");
              c.setEmail("");
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.phoneNumber;
                delete next.bookingVerificationToken;
                return next;
              });
            }}
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={c.submitFieldErrors.phoneNumber ? true : undefined}
            aria-describedby={c.submitFieldErrors.phoneNumber ? "pb-phone-error" : undefined}
          />
          {c.submitFieldErrors.phoneNumber ? (
            <p id="pb-phone-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
              {c.submitFieldErrors.phoneNumber}
            </p>
          ) : null}
          {!phoneChecked ? (
            <Button
              type="button"
              className="mt-2 h-11 w-full rounded-[var(--radius-md)] text-[length:var(--fs-base)] font-semibold"
              onClick={() => void c.runPhoneCheck()}
              disabled={!c.phone.trim() || c.phoneCheck.isPending}
            >
              Continue
            </Button>
          ) : null}
        </div>

        <div className="space-y-3 sm:col-span-2">
          {c.requiresOtp === false ? (
            <Alert className="rounded-[var(--radius-md)] border border-border/70 bg-muted/25 text-left shadow-sm">
              <AlertTitle className="text-[length:var(--fs-sm)]">
                New to booking here online
              </AlertTitle>
              <AlertDescription className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                We did not find an existing chart for this phone number at this location yet.
                Submit your request and staff will confirm your visit.
              </AlertDescription>
            </Alert>
          ) : null}

          {c.requiresOtp ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-primary/35 bg-gradient-to-br from-primary/[0.07] to-card p-4 shadow-sm">
              <div className="space-y-1">
                <MicroLabel as="p" className="mt-0">Verify your phone</MicroLabel>
                <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                  This phone matches records at this location. Request a one-time code via WhatsApp,
                  then enter it so we can show your recent visits.
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
                <Label htmlFor="pb-otp" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
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
                  aria-invalid={c.submitFieldErrors.bookingVerificationToken ? true : undefined}
                  aria-describedby={
                    c.submitFieldErrors.bookingVerificationToken ? "pb-otp-error" : undefined
                  }
                />
                {c.submitFieldErrors.bookingVerificationToken ? (
                  <p id="pb-otp-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
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

        {isNewPatient ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="pb-first-name" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
                First name{requiredMark}
              </Label>
              <Input
                id="pb-first-name"
                value={c.firstName}
                onChange={(e) => {
                  c.setFirstName(e.target.value);
                  c.setSubmitFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.firstName;
                    return next;
                  });
                }}
                autoComplete="given-name"
                aria-invalid={c.submitFieldErrors.firstName ? true : undefined}
                aria-describedby={c.submitFieldErrors.firstName ? "pb-first-name-error" : undefined}
              />
              {c.submitFieldErrors.firstName ? (
                <p id="pb-first-name-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
                  {c.submitFieldErrors.firstName}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pb-last-name" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
                Last name{requiredMark}
              </Label>
              <Input
                id="pb-last-name"
                value={c.lastName}
                onChange={(e) => {
                  c.setLastName(e.target.value);
                  c.setSubmitFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.lastName;
                    return next;
                  });
                }}
                autoComplete="family-name"
                aria-invalid={c.submitFieldErrors.lastName ? true : undefined}
                aria-describedby={c.submitFieldErrors.lastName ? "pb-last-name-error" : undefined}
              />
              {c.submitFieldErrors.lastName ? (
                <p id="pb-last-name-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
                  {c.submitFieldErrors.lastName}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <IsoDatePickerField
                id="pb-date-of-birth"
                label="Date of birth"
                requiredMark
                value={c.dateOfBirth}
                onChange={(iso) => {
                  c.setDateOfBirth(iso);
                  c.setSubmitFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.dateOfBirth;
                    return next;
                  });
                }}
                placeholder="Select date of birth"
                required
                triggerClassName={cn(
                  "w-full sm:w-full",
                  c.submitFieldErrors.dateOfBirth && "border-destructive",
                )}
              />
              {c.submitFieldErrors.dateOfBirth ? (
                <p id="pb-date-of-birth-error" role="alert" className="mt-1 text-[length:var(--fs-xs)] leading-snug text-destructive">
                  {c.submitFieldErrors.dateOfBirth}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pb-email" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
                Email
              </Label>
              <Input
                id="pb-email"
                value={c.email}
                onChange={(e) => {
                  c.setEmail(e.target.value);
                  c.setSubmitFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }}
                autoComplete="email"
                type="email"
                aria-invalid={c.submitFieldErrors.email ? true : undefined}
                aria-describedby={c.submitFieldErrors.email ? "pb-email-error" : undefined}
              />
              {c.submitFieldErrors.email ? (
                <p id="pb-email-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
                  {c.submitFieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/30 p-4 sm:col-span-2">
              <p className="text-[length:var(--fs-sm)] font-semibold text-foreground">
                {DPDP_NOTICE_TITLE}
                <span aria-hidden className="ml-0.5 text-destructive">*</span>
              </p>
              <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
                {DPDP_NOTICE_TEXT_PATIENT}
              </p>
              <label
                htmlFor="pb-dpdp-consent"
                className="mt-2 flex cursor-pointer items-start gap-2 text-[length:var(--fs-sm)]"
              >
                <Checkbox
                  id="pb-dpdp-consent"
                  checked={c.dpdpConsentAccepted}
                  onCheckedChange={(checked) => {
                    c.setDpdpConsentAccepted(checked === true);
                  }}
                />
                <span>
                  I have read this notice and consent to my personal and health
                  data being processed per the description above.
                </span>
              </label>
            </div>
          </>
        ) : null}

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pb-reason" className="text-[length:var(--fs-sm)] font-normal text-muted-foreground">
            Reason for visit
          </Label>
          <Input
            id="pb-reason"
            value={c.reason}
            onChange={(e) => {
              c.setReason(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.reason;
                return next;
              });
            }}
            aria-invalid={c.submitFieldErrors.reason ? true : undefined}
            aria-describedby={c.submitFieldErrors.reason ? "pb-reason-error" : undefined}
          />
          {c.submitFieldErrors.reason ? (
            <p id="pb-reason-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
              {c.submitFieldErrors.reason}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pb-notes" className="text-[length:var(--fs-sm)] font-normal leading-none text-muted-foreground">
            Notes for the team
          </Label>
          <Textarea
            id="pb-notes"
            value={c.notes}
            onChange={(e) => {
              c.setNotes(e.target.value);
              c.setSubmitFieldErrors((prev) => {
                const next = { ...prev };
                delete next.notes;
                return next;
              });
            }}
            placeholder="Enter notes for the team"
            maxLength={1000}
            aria-invalid={c.submitFieldErrors.notes ? true : undefined}
            aria-describedby={c.submitFieldErrors.notes ? "pb-notes-error" : undefined}
            className={cn(
              "min-h-[96px] rounded-[var(--radius-md)] border-border/80 bg-background text-[length:var(--fs-sm)] shadow-sm",
              c.submitFieldErrors.notes && "border-destructive",
            )}
          />
          {c.submitFieldErrors.notes ? (
            <p id="pb-notes-error" role="alert" className="text-[length:var(--fs-xs)] leading-snug text-destructive">
              {c.submitFieldErrors.notes}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
