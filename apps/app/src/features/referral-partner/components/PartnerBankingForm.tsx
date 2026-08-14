import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { usePartnerPayoutDetails } from "@workspace/data-access";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
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
  const { t } = useTranslation("ReferralPartner.banking");
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
      setError(t("errorIfsc"));
      return;
    }
    const accountNumber = form.accountNumber.replace(/\D/g, "");
    if (accountNumber.length < 9 || accountNumber.length > 18) {
      setError(t("errorAccountNumber"));
      return;
    }
    const upiId = form.upiId.trim();
    if (upiId && !UPI_REGEX.test(upiId)) {
      setError(t("errorUpi"));
      return;
    }
    const pan = form.pan.trim().toUpperCase();
    if (pan && !PAN_REGEX.test(pan)) {
      setError(t("errorPan"));
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
      setSuccess(t("successSaved"));
      setForm(EMPTY);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: t("errorSaveFallback"),
          context: "save",
        }),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {me.data?.payoutDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("currentDetailsTitle")}</CardTitle>
            <CardDescription>
              {me.data.payoutDetails.verified
                ? t("verifiedDescription")
                : t("unverifiedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("accountHolder")}</dt>
                <dd>{me.data.payoutDetails.accountHolder}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("accountLast4")}</dt>
                <dd className="font-mono">**** {me.data.payoutDetails.accountNumberLast4}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("ifsc")}</dt>
                <dd className="font-mono">{me.data.payoutDetails.ifsc}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("bank")}</dt>
                <dd>{me.data.payoutDetails.bankName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {me.data?.payoutDetails ? t("updateTitle") : t("addTitle")}
          </CardTitle>
          <CardDescription>{t("formDescription")}</CardDescription>
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
                <Label htmlFor="bank-accountHolder">{t("accountHolderNameLabel")}</Label>
                <Input
                  id="bank-accountHolder"
                  value={form.accountHolder}
                  onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-accountNumber">{t("accountNumberLabel")}</Label>
                <Input
                  id="bank-accountNumber"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-ifsc">{t("ifsc")}</Label>
                <Input
                  id="bank-ifsc"
                  value={form.ifsc}
                  onChange={(e) => setForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-bankName">{t("bankNameLabel")}</Label>
                <Input
                  id="bank-bankName"
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-upi">{t("upiLabel")}</Label>
                <Input
                  id="bank-upi"
                  value={form.upiId}
                  onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-pan">{t("panLabel")}</Label>
                <Input
                  id="bank-pan"
                  value={form.pan}
                  onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? t("saving") : t("saveDetails")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
