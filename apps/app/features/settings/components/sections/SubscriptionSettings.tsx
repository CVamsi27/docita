import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/api/use-settings";
import { useBillingStatus } from "@/hooks/api/use-billing";
import { DynamicPricingEstimator } from "@/features/subscription/components/DynamicPricingEstimator";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Check, Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  invoiceUrl?: string | null;
  description?: string;
}

function BillingHistory() {
  const { token } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
      // Official endpoint for payment history
      const res = await fetch(`${apiUrl}/subscription/billing/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch billing history");
      return res.json() as Promise<Invoice[]>;
    },
    enabled: !!token,
  });

  const handleDownload = (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
        <p>No billing history available</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {invoice.description || "Subscription Payment"}
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: invoice.currency || "INR",
                }).format(invoice.amountCents / 100)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    invoice.status === "paid" // Status is lowercase in DB schema usually, but check
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200",
                  )}
                >
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {invoice.invoiceUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(invoice.invoiceUrl!)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SubscriptionSettings() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: subscription, isLoading } = useSubscription();
  const { data: billingStatus } = useBillingStatus();

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <div className="h-4 w-[250px] bg-muted animate-pulse rounded" />
              <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = subscription?.tierName || "Free Plan";
  const subscriptionStatus = subscription?.subscriptionStatus || "Inactive";

  const hasIntelligence = subscription?.intelligenceAddon === "active";

  // Simplified view for non-admin users (doctors, receptionists)
  if (!isAdmin) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg">{tierName}</p>
            <Badge variant="secondary" className="capitalize">
              {subscriptionStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Contact your clinic administrator to manage subscription.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Full view for admin users
  const currencyCode = billingStatus?.lastPayment?.currency || "INR";
  const billingCycle = (
    billingStatus?.subscription?.billingCycle || "MONTHLY"
  ).toUpperCase();
  const cycleLabel = billingCycle === "YEARLY" ? "year" : "month";

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
  });

  const baseAmount =
    typeof billingStatus?.subscription?.basePriceCents === "number"
      ? formatter.format(billingStatus.subscription.basePriceCents / 100)
      : null;

  const fallbackAmount =
    typeof billingStatus?.lastPayment?.amount === "number"
      ? formatter.format(billingStatus.lastPayment.amount)
      : null;

  const price = billingStatus?.subscription?.scheduledChange?.tier
    ? "Scheduled plan change"
    : `${baseAmount || fallbackAmount || "Pricing unavailable"}/${cycleLabel}`;

  const renewsAt = billingStatus?.subscription?.currentPeriodEnd
    ? new Date(billingStatus.subscription.currentPeriodEnd).toLocaleDateString()
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-none shadow-lg bg-linear-to-br from-background to-muted/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Current Plan</CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </div>
          <Badge
            variant={
              subscriptionStatus === "active" ? "default" : "destructive"
            }
            className="capitalize"
          >
            {subscriptionStatus}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background/50 backdrop-blur-sm">
            <div className="space-y-1">
              <p className="font-semibold text-lg">{tierName}</p>
              <div className="text-sm text-muted-foreground space-x-2">
                <span>{price}</span>
                <span>•</span>
                <span>Renews {renewsAt}</span>
              </div>
            </div>
            <Button onClick={() => router.push("/upgrade")}>
              {subscription?.tier === "enterprise"
                ? "Contact Support"
                : "Manage Plan"}
            </Button>
          </div>

          {/* Active Add-ons */}
          {hasIntelligence && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Active Add-on
              </h4>
              <div className="grid gap-4 md:grid-cols-1">
                {hasIntelligence && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-purple-900 dark:text-purple-100">
                        AI Intelligence
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Portal & History */}
      <DynamicPricingEstimator />

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingHistory />
        </CardContent>
      </Card>

      {/* Billing Portal Link (Optional placeholder for Stripe/Razorpay portal) */}
      <div className="flex justify-end">
        <Button variant="link" className="text-muted-foreground" disabled>
          Manage Payment Methods <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
