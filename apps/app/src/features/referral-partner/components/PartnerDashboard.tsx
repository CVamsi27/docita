import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerMe } from "@workspace/data-access";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { formatPaise } from "@/features/referral-partner/lib/format-currency";

export function PartnerDashboard() {
  const { t } = useTranslation("ReferralPartner");
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const me = usePartnerMe(ctx.accessToken, ctx.baseUrl);

  if (me.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("dashboard.loading")}</div>;
  }
  if (me.isError || !me.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.loadErrorTitle")}</CardTitle>
          <CardDescription>
            {me.error instanceof Error
              ? me.error.message
              : t("dashboard.loadErrorDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void me.refetch()}>{t("dashboard.retryButton")}</Button>
        </CardContent>
      </Card>
    );
  }

  const d = me.data;
  const conversionRate =
    d.counts.referrals > 0
      ? Math.round((d.counts.converted / d.counts.referrals) * 100)
      : 0;
  const hasBanking = d.payoutDetails !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.welcomeTitle", { name: d.name })}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.referralCodeDescription", { code: d.code })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.referralsLabel")}</CardDescription>
            <CardTitle className="text-2xl">{d.counts.referrals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.convertedLabel")}</CardDescription>
            <CardTitle className="text-2xl">
              {d.counts.converted}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({conversionRate}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.pendingPayoutsLabel")}</CardDescription>
            <CardTitle className="text-2xl">
              {formatPaise(d.counts.pendingPayoutsCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.paidOutLabel")}</CardDescription>
            <CardTitle className="text-2xl">
              {formatPaise(d.counts.paidPayoutsCents)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.shareKitTitle")}</CardTitle>
          <CardDescription>
            {t("dashboard.shareKitDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/partner/share">{t("dashboard.openShareKit")}</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={d.signupUrl} target="_blank" rel="noreferrer">
              {t("dashboard.previewSignupLink")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={d.showcasePdfUrl} target="_blank" rel="noreferrer">
              {t("dashboard.downloadShowcasePdf")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.bankingDetailsTitle")}</CardTitle>
          <CardDescription>
            {hasBanking
              ? d.payoutDetails?.verified
                ? t("dashboard.bankingVerified", { date: new Date(d.payoutDetails.updatedAt).toLocaleDateString() })
                : t("dashboard.bankingSubmittedNotVerified")
              : t("dashboard.bankingAddDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasBanking ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("dashboard.accountHolderLabel")}</dt>
                <dd>{d.payoutDetails?.accountHolder}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("dashboard.accountLast4Label")}</dt>
                <dd className="font-mono">**** **** {d.payoutDetails?.accountNumberLast4}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("dashboard.ifscLabel")}</dt>
                <dd className="font-mono">{d.payoutDetails?.ifsc}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("dashboard.bankLabel")}</dt>
                <dd>{d.payoutDetails?.bankName}</dd>
              </div>
            </dl>
          ) : (
            <Button asChild>
              <Link to="/partner/banking">{t("dashboard.addBankDetails")}</Link>
            </Button>
          )}
          <div className="mt-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/partner/banking">
                {hasBanking ? t("dashboard.updateBankDetails") : t("dashboard.addBankDetails")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
