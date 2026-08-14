import { useTranslation } from "react-i18next";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerPayouts } from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { formatPaise } from "@/features/referral-partner/lib/format-currency";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  PAID: "default",
  VOID: "outline",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  PAID: "statusPaid",
  VOID: "statusVoid",
};

export function PartnerPayoutsView() {
  const { t } = useTranslation("ReferralPartner.payouts");
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const payouts = usePartnerPayouts(ctx.accessToken, ctx.baseUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {payouts.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("loading")}</div>
      ) : payouts.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("loadErrorTitle")}</CardTitle>
            <CardDescription>
              {payouts.error instanceof Error
                ? payouts.error.message
                : t("loadErrorDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !payouts.data || payouts.data.items.length === 0 ? (
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
                <th className="px-3 py-2 text-left font-medium">{t("columnPeriod")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("columnBase")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("columnRate")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("columnAmount")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("columnStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.periodStart.slice(0, 10)} → {row.periodEnd.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPaise(row.baseRevenueCents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.ratePercent}%</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatPaise(row.amountCents)}
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
