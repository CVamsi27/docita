"use client";

import { FormEvent, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { usePartnerPayoutDetails } from "@workspace/data-access";
// eslint-disable-next-line no-restricted-imports -- sibling within the same feature, not a cross-feature ../ escape
import { usePartnerAuth } from "../hooks/use-partner-auth";
import { usePartnerMe } from "@workspace/data-access";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { Alert, AlertDescription } from "@workspace/ui/components/feedback/alert";

interface FormState {
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string;
  pan: string;
}

const EMPTY: FormState = {
  accountHolder: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  upiId: "",
  pan: "",
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export function PartnerBankingForm() {
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const me = usePartnerMe(ctx.accessToken, ctx.baseUrl);
  const upsert = usePartnerPayoutDetails(ctx.accessToken, ctx.baseUrl);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const ifsc = form.ifsc.trim().toUpperCase();
    if (!IFSC_REGEX.test(ifsc)) {
      setError("IFSC must look like AAAA0XXXXXX (11 chars).");
      return;
    }
    const accountNumber = form.accountNumber.replace(/\D/g, "");
    if (accountNumber.length < 9 || accountNumber.length > 18) {
      setError("Account number must be 9-18 digits.");
      return;
    }
    const upiId = form.upiId.trim();
    if (upiId && !UPI_REGEX.test(upiId)) {
      setError("UPI ID looks invalid (expected user@bank).");
      return;
    }
    const pan = form.pan.trim().toUpperCase();
    if (pan && !PAN_REGEX.test(pan)) {
      setError("PAN must look like AAAAA9999A.");
      return;
    }

    try {
      await upsert.mutateAsync({
        accountHolder: form.accountHolder.trim(),
        accountNumber,
        ifsc,
        bankName: form.bankName.trim(),
        ...(upiId ? { upiId } : {}),
        ...(pan ? { pan } : {}),
      });
      setSuccess("Bank details saved. We'll review and verify before the next payout.");
      setForm(EMPTY);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not save your details. Try again.",
          context: "save",
        }),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banking details</h1>
        <p className="text-sm text-muted-foreground">
          We pay you via bank transfer (NEFT / RTGS / UPI). The account holder name must match the name on your PAN.
        </p>
      </div>

      {me.data?.payoutDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>Current details</CardTitle>
            <CardDescription>
              {me.data.payoutDetails.verified
                ? "Verified. Editing will require a fresh review."
                : "Submitted but not yet verified. You can still edit until we approve."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Account holder</dt>
                <dd>{me.data.payoutDetails.accountHolder}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account (last 4)</dt>
                <dd className="font-mono">**** {me.data.payoutDetails.accountNumberLast4}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IFSC</dt>
                <dd className="font-mono">{me.data.payoutDetails.ifsc}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bank</dt>
                <dd>{me.data.payoutDetails.bankName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {me.data?.payoutDetails ? "Update details" : "Add bank details"}
          </CardTitle>
          <CardDescription>
            Saved values are encrypted at rest. We display only the last 4 digits of the account number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-accountHolder">Account holder name</Label>
                <Input
                  id="bank-accountHolder"
                  value={form.accountHolder}
                  onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-accountNumber">Account number</Label>
                <Input
                  id="bank-accountNumber"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-ifsc">IFSC</Label>
                <Input
                  id="bank-ifsc"
                  value={form.ifsc}
                  onChange={(e) => setForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-bankName">Bank name</Label>
                <Input
                  id="bank-bankName"
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-upi">UPI ID (optional)</Label>
                <Input
                  id="bank-upi"
                  value={form.upiId}
                  onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-pan">PAN (optional, for TDS purposes)</Label>
                <Input
                  id="bank-pan"
                  value={form.pan}
                  onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Saving..." : "Save details"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
