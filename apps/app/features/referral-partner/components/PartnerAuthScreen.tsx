"use client";

import { FormEvent } from "react";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { Alert, AlertDescription } from "@workspace/ui/components/feedback/alert";
import { usePartnerAuth } from "../hooks/use-partner-auth";

export function PartnerAuthScreen() {
  const auth = usePartnerAuth();

  const handlePhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    void auth.request();
  };
  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    void auth.verify();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="ui-card-surface w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70">
            {auth.step === "phone" ? (
              <Phone className="h-6 w-6 text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {auth.step === "phone" ? "Sign in to partner portal" : "Enter verification code"}
          </CardTitle>
          <CardDescription>
            {auth.step === "phone"
              ? "We will send a 6-digit code to your phone on WhatsApp."
              : `Code sent to ${auth.phone}. Enter it to continue.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auth.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{auth.error}</AlertDescription>
            </Alert>
          ) : null}

          {auth.step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partner-phone">Phone number</Label>
                <Input
                  id="partner-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98XXXXXXXX"
                  value={auth.phone}
                  onChange={(e) => auth.setPhone(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={auth.isRequesting}
              >
                {auth.isRequesting ? "Sending code..." : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partner-otp">Verification code</Label>
                <Input
                  id="partner-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={auth.otp}
                  onChange={(e) => auth.setOtp(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={auth.isVerifying}>
                {auth.isVerifying ? "Verifying..." : "Verify"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => auth.setStep("phone")}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Change number
                </button>
                <button
                  type="button"
                  onClick={() => void auth.request()}
                  className="text-primary hover:underline"
                  disabled={auth.isRequesting}
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
