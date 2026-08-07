"use client";

// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import {
  Alert,
// jscpd:ignore-end
  AlertDescription,
} from "@workspace/ui/components/feedback/alert";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { usePortalOtpAuth } from "@/features/patient-portal/hooks/use-portal-otp-auth";

export function PortalOtpLoginUI() {
  const { t } = useTranslation("PatientPortal");
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
            {step === "phone" ? t("login.phoneTitle") : t("login.otpTitle")}
          </CardTitle>
          <CardDescription className="ui-page-subtitle">
            {step === "phone"
              ? t("login.phoneDescription")
              : t("login.otpDescription", { phone: phoneNumber })}
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
                <Label htmlFor="phone">{t("login.mobileNumberLabel")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("login.mobileNumberPlaceholder")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  autoComplete="tel"
                  autoFocus
                />
              </div>
              {/* jscpd:ignore-start */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? (
                  <>
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    {t("login.sendingCode")}
                  </>
                ) : (
                  t("login.sendCode")
                )}
              </Button>
              {/* jscpd:ignore-end */}
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">{t("login.otpLabel")}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("login.otpPlaceholder")}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              {/* jscpd:ignore-start */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    {t("login.verifying")}
                  </>
                ) : (
                  t("login.verifyCode")
                )}
              </Button>
              {/* jscpd:ignore-end */}
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
                  {t("login.changeNumber")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={resendOtp}
                  disabled={isLoading}
                >
                  {t("login.resendCode")}
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {t("login.termsNotice")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
