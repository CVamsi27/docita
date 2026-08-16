import { useTranslation } from "react-i18next";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerMyLeads } from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components";

type BadgeVariant = "default" | "secondary" | "outline";

/** Partner-facing labels for the states a partner can actually see. */
const STATUS_META: Record<string, { labelKey: string; variant: BadgeVariant }> =
  {
    SUBMITTED: { labelKey: "statusSubmitted", variant: "secondary" },
    DUPLICATE_REVIEW: { labelKey: "statusUnderReview", variant: "outline" },
    CONVERTED: { labelKey: "statusOnboarded", variant: "default" },
  };

const IN_PROGRESS_STATUSES = new Set([
  "TRIAGED",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "DEMO_SCHEDULED",
  "ONBOARDING",
  "TRIAL",
]);

/** Remaining states (terminal/exception) collapse to a single "Closed" copy. */
function statusMeta(status: string): { labelKey: string; variant: BadgeVariant } {
  if (STATUS_META[status]) return STATUS_META[status];
  return IN_PROGRESS_STATUSES.has(status)
    ? { labelKey: "statusInProgress", variant: "outline" }
    : { labelKey: "statusClosed", variant: "outline" };
}

export function PartnerMySubmissionsView() {
  const { t } = useTranslation("ReferralPartner.mySubmissions");
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const leads = usePartnerMyLeads(ctx.accessToken, ctx.baseUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {leads.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("loading")}</div>
      ) : leads.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("loadErrorTitle")}</CardTitle>
            <CardDescription>
              {leads.error instanceof Error
                ? leads.error.message
                : t("loadErrorDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !leads.data || leads.data.items.length === 0 ? (
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
                <th className="px-3 py-2 text-left font-medium">
                  {t("columnFacility")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("columnStatus")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("columnSubmitted")}
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.data.items.map((lead) => {
                const meta = statusMeta(lead.status);
                return (
                  <tr key={lead.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{lead.facilityName}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.city}
                        {lead.state ? `, ${lead.state}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={meta.variant}>{t(meta.labelKey)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {lead.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
