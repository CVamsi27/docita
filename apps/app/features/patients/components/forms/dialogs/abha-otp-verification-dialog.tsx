"use client";

import React, { FC, useState } from "react";
import type { AbhaVerificationResult } from "@workspace/types";
import {
  useSearchAbhaByMobile,
  useRequestAbhaOtp,
  useVerifyAbhaOtp,
} from "@workspace/data-access";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { getAbhaVerificationErrorState } from "./abha-verification-errors";

interface AbhaOtpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onVerified: (result: AbhaVerificationResult) => void;
}

type Step = "mobile" | "accounts" | "otp";

interface AccountEntry {
  index: number;
  abhaNumber: string;
  name: string;
  gender: string | null;
  authMethods: string[];
}

export const AbhaOtpVerificationDialog: FC<AbhaOtpVerificationDialogProps> = ({
  open,
  onOpenChange,
  patientId,
  onVerified,
}) => {
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [txnId, setTxnId] = useState("");
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const searchMutation = useSearchAbhaByMobile();
  const requestOtpMutation = useRequestAbhaOtp();
  const verifyOtpMutation = useVerifyAbhaOtp();

  const reset = () => {
    setStep("mobile");
    setMobile("");
    setTxnId("");
    setAccounts([]);
    setSelectedIndex(null);
    setOtp("");
    setError(null);
    searchMutation.reset();
    requestOtpMutation.reset();
    verifyOtpMutation.reset();
  };

  const handleClose = (value: boolean) => {
    reset();
    onOpenChange(value);
  };

  const handleSearch = async () => {
    setError(null);
    try {
      const result = await searchMutation.mutateAsync({
        patientId,
        mobile,
      });
      setTxnId(result.txnId);
      setAccounts((result.accounts as AccountEntry[]) ?? []);
      setStep("accounts");
    } catch (err) {
      const state = getAbhaVerificationErrorState(err);
      setError(state.message ?? null);
    }
  };

  const handleRequestOtp = async (account: AccountEntry) => {
    setError(null);
    setSelectedIndex(account.index);
    try {
      const result = await requestOtpMutation.mutateAsync({
        patientId,
        txnId,
        index: account.index,
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

  const isSearching = searchMutation.isPending;
  const isRequestingOtp = requestOtpMutation.isPending;
  const isVerifying = verifyOtpMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent density="compact">
        <DialogHeader>
          <DialogTitle>Verify ABHA via OTP</DialogTitle>
          <DialogDescription>
            {step === "mobile" &&
              "Enter the patient's mobile number to search for linked ABHA accounts."}
            {step === "accounts" && "Select the ABHA account to verify."}
            {step === "otp" && "Enter the OTP sent to the registered mobile."}
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
                Mobile number
              </label>
              <Input
                id="abha-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter 10-digit mobile number"
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
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={mobile.length !== 10 || isSearching}
              >
                {isSearching ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "accounts" && (
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ABHA accounts found for this mobile number.
              </p>
            ) : (
              <ul className="space-y-2">
                {accounts.map((account) => (
                  <li key={account.index}>
                    <Button
                      type="button"
                      variant={
                        selectedIndex === account.index ? "default" : "outline"
                      }
                      className="w-full justify-start text-left"
                      onClick={() => handleRequestOtp(account)}
                      disabled={isRequestingOtp}
                    >
                      <span className="flex-1">
                        <span className="font-medium">{account.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {account.abhaNumber}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("mobile");
                  setAccounts([]);
                }}
              >
                Back
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
                OTP
              </label>
              <Input
                id="abha-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter the OTP"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("accounts");
                  setOtp("");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otp.trim() || isVerifying}
              >
                {isVerifying ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
