import { useTranslation } from "react-i18next";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerReferrals } from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";

const STATUS_LABEL_KEY: Record<string, string> = {
  PENDING: "statusPending",
  SIGNED_UP: "statusSignedUp",
  CONVERTED: "statusConverted",
  REJECTED: "statusRejected",
  EXPIRED: "statusExpired",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  SIGNED_UP: "secondary",
  CONVERTED: "default",
  REJECTED: "outline",
  EXPIRED: "outline",
};

export function PartnerReferralsView() {
  const { t } = useTranslation("ReferralPartner.referrals");
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const referrals = usePartnerReferrals(ctx.accessToken, ctx.baseUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {referrals.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("loading")}</div>
      ) : referrals.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("loadErrorTitle")}</CardTitle>
            <CardDescription>
              {referrals.error instanceof Error
                ? referrals.error.message
                : t("loadErrorDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !referrals.data || referrals.data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("columnClinic")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("columnSignedUp")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("columnStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {referrals.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.referredClinicName ?? (
                      <span className="text-muted-foreground">{t("notYetOnDocita")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                      {t(STATUS_LABEL_KEY[row.status] ?? row.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
