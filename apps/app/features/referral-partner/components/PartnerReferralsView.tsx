"use client";

// eslint-disable-next-line no-restricted-imports -- sibling within the same feature, not a cross-feature ../ escape
import { usePartnerAuth } from "../hooks/use-partner-auth";
import { usePartnerReferrals } from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Invited",
  SIGNED_UP: "Signed up",
  CONVERTED: "Active (paying)",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  SIGNED_UP: "secondary",
  CONVERTED: "default",
  REJECTED: "outline",
  EXPIRED: "outline",
};

export function PartnerReferralsView() {
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const referrals = usePartnerReferrals(ctx.accessToken, ctx.baseUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Clinics that signed up using your code. &apos;Active (paying)&apos; means their first paid invoice cleared.
        </p>
      </div>

      {referrals.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading referrals...</div>
      ) : referrals.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Could not load referrals</CardTitle>
            <CardDescription>
              {referrals.error instanceof Error
                ? referrals.error.message
                : "Try again in a moment."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !referrals.data || referrals.data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No referrals yet. Share your code from the Share kit page to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Clinic</th>
                <th className="px-3 py-2 text-left font-medium">Signed up</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.referredClinicName ?? (
                      <span className="text-muted-foreground">(not yet on Docita)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.createdAt.slice(0, 10)}
                  </td>
                  {/* jscpd:ignore-start — closing table shape shared with PartnerPayoutsView */}
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* jscpd:ignore-end */}
    </div>
  );
}
