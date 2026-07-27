"use client";

import Link from "next/link";
import { usePartnerAuth } from "../hooks/use-partner-auth";
import { usePartnerMe } from "@workspace/data-access";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { formatPaise } from "../lib/format-currency";

export function PartnerDashboard() {
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const me = usePartnerMe(ctx.accessToken, ctx.baseUrl);

  if (me.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }
  if (me.isError || !me.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load your dashboard</CardTitle>
          <CardDescription>
            {me.error instanceof Error
              ? me.error.message
              : "Please try again in a moment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void me.refetch()}>Retry</Button>
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
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {d.name}</h1>
        <p className="text-sm text-muted-foreground">
          Your referral code is{" "}
          <span className="font-mono font-medium text-foreground">{d.code}</span>. Share it with doctors and clinic owners to earn revenue-share on their first year of Docita.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Referrals</CardDescription>
            <CardTitle className="text-2xl">{d.counts.referrals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
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
            <CardDescription>Pending payouts</CardDescription>
            <CardTitle className="text-2xl">
              {formatPaise(d.counts.pendingPayoutsCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid out (lifetime)</CardDescription>
            <CardTitle className="text-2xl">
              {formatPaise(d.counts.paidPayoutsCents)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your share kit</CardTitle>
          <CardDescription>
            Copy the message, download the showcase PDF, or send a doctor the signup link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/partner/share">Open share kit</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={d.signupUrl} target="_blank" rel="noreferrer">
              Preview signup link
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={d.showcasePdfUrl} target="_blank" rel="noreferrer">
              Download showcase PDF
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banking details</CardTitle>
          <CardDescription>
            {hasBanking
              ? d.payoutDetails?.verified
                ? `Verified (last updated ${new Date(
                    d.payoutDetails.updatedAt,
                  ).toLocaleDateString()})`
                : "Submitted but not yet verified. We pay you once we confirm."
              : "Add your bank account so we can pay your revenue share."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasBanking ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Account holder</dt>
                <dd>{d.payoutDetails?.accountHolder}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account (last 4)</dt>
                <dd className="font-mono">**** **** {d.payoutDetails?.accountNumberLast4}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IFSC</dt>
                <dd className="font-mono">{d.payoutDetails?.ifsc}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bank</dt>
                <dd>{d.payoutDetails?.bankName}</dd>
              </div>
            </dl>
          ) : (
            <Button asChild>
              <Link href="/partner/banking">Add bank details</Link>
            </Button>
          )}
          <div className="mt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/partner/banking">
                {hasBanking ? "Update bank details" : "Add bank details"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
