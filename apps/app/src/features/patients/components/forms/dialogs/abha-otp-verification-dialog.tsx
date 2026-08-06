import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AbhaVerificationResult } from "@workspace/types";
import { useRequestAbhaOtp, useVerifyAbhaOtp } from "@workspace/data-access";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { getAbhaVerificationErrorState } from "./abha-verification-errors";

interface AbhaOtpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onVerified: (result: AbhaVerificationResult) => void;
}

type Step = "mobile" | "otp";

export const AbhaOtpVerificationDialog: FC<AbhaOtpVerificationDialogProps> = ({
  open,
  onOpenChange,
  patientId,
  onVerified,
}) => {
  const { t } = useTranslation("Patients.abhaOtpDialog");
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [txnId, setTxnId] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestOtpMutation = useRequestAbhaOtp();
  const verifyOtpMutation = useVerifyAbhaOtp();

  const reset = () => {
    setStep("mobile");
    setMobile("");
    setTxnId("");
    setOtp("");
    setError(null);
    requestOtpMutation.reset();
    verifyOtpMutation.reset();
  };

  const handleClose = (value: boolean) => {
    reset();
    onOpenChange(value);
  };

  const handleRequestOtp = async () => {
    setError(null);
    try {
      const result = await requestOtpMutation.mutateAsync({
        patientId,
        mobile,
      });
      setTxnId(result.txnId);
      setStep("otp");
    } catch (err) {
      const state = getAbhaVerificationErrorState(err);
      setError(state.message ?? null);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    try {
      const result = await verifyOtpMutation.mutateAsync({
        patientId,
        txnId,
        otp,
      });
      onVerified(result);
      handleClose(false);
    } catch (err) {
      const state = getAbhaVerificationErrorState(err);
      setError(state.message ?? null);
    }
  };

  const isRequestingOtp = requestOtpMutation.isPending;
  const isVerifying = verifyOtpMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent density="compact">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {step === "mobile" && t("mobileDescription")}
            {step === "otp" && t("otpDescription")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {step === "mobile" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="abha-mobile"
                className="text-sm font-medium leading-none"
              >
                {t("mobileLabel")}
              </label>
              <Input
                id="abha-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t("mobilePlaceholder")}
                maxLength={10}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                {t("cancelButton")}
              </Button>
              <Button
                type="button"
                onClick={handleRequestOtp}
                disabled={mobile.length !== 10 || isRequestingOtp}
              >
                {isRequestingOtp ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  t("sendOtpButton")
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="abha-otp"
                className="text-sm font-medium leading-none"
              >
                {t("otpLabel")}
              </label>
              <Input
                id="abha-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t("otpPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("mobile")}
              >
                {t("backButton")}
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otp.length === 0 || isVerifying}
              >
                {isVerifying ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  t("verifyButton")
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
