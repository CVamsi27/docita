"use client";

import { FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Loader2, ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { usePortalOtpAuth } from "@/features/patient-portal/hooks/use-portal-otp-auth";

export function PortalOtpLoginUI() {
  const {
    phoneNumber,
    setPhoneNumber,
    otp,
    setOtp,
    step,
    isLoading,
    error,
    requestOtp,
    verifyOtp,
    goBack,
    resendOtp,
  } = usePortalOtpAuth();

  const handlePhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    requestOtp();
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    verifyOtp();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="ui-card-surface w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70">
            {step === "phone" ? (
              <Phone className="h-6 w-6 text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="ui-page-title text-[var(--fs-3xl)]">
            {step === "phone" ? "Patient Portal" : "Enter Verification Code"}
          </CardTitle>
          <CardDescription className="ui-page-subtitle">
            {step === "phone"
              ? "Enter your registered mobile number to receive a verification code"
              : `We sent a 6-digit verification code to ${phoneNumber}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  autoComplete="tel"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  disabled={isLoading}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change number
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={resendOtp}
                  disabled={isLoading}
                >
                  Resend Code
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
