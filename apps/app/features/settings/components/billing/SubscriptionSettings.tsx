"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import { getTierInfo } from "@/lib/tier-config";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSubscription } from "@/hooks/api/use-settings";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/support-contact";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { PaymentSuccessModal } from "@/features/subscription/components";
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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { DEFAULT_CURRENCY } from "@workspace/utils";

function BillingHistory() {
  const { data: invoices, isLoading } = useBillingHistory();

  const handleDownload = (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank");
  };

  const handleExportCsv = () => {
    if (!invoices || invoices.length === 0) return;

    const header = [
      "Date",
      "Description",
      "Amount",
      "Currency",
      "Status",
      "ReceiptUrl",
    ];

    const rows = invoices.map((invoice) => {
      const formattedDate = new Date(invoice.createdAt).toISOString();
      const description = (invoice.description || "Subscription Payment").replaceAll(
        '"',
        '""',
      );
      const amount = (invoice.amountCents / 100).toFixed(2);
      const currency = invoice.currency || DEFAULT_CURRENCY;
      const status = invoice.status;
      const receipt = invoice.invoiceUrl || "";

      return [
        formattedDate,
        `"${description}"`,
        amount,
        currency,
        status,
        `"${receipt}"`,
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `billing-history-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      <div className="rounded-md border bg-muted/20 py-8 text-center text-muted-foreground">
        <FileText className="mx-auto mb-2 h-10 w-10 opacity-20" />
        <p>No billing history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExportCsv}
          disabled={!invoices || invoices.length === 0}
        >
          <Download className="h-4 w-4" />
          Export All CSV
        </Button>
      </div>

      <div className="rounded-md border">
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
                <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {invoice.description || "Subscription Payment"}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: invoice.currency || DEFAULT_CURRENCY,
                  }).format(invoice.amountCents / 100)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      invoice.status === "paid"
                        ? "badge-success"
                        : "badge-warning",
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
    </div>
  );
}

export function SubscriptionSettings() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { currentTier } = usePermissionStore();
  const { data: subscription, isLoading } = useSubscription();
  const billingHistoryRef = useRef<HTMLDivElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });

  const supportPhone = getSupportPhoneNumber();

  useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
  });

  if (isLoading) {
    return (
      <Card >
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <div className="h-4 w-[250px] rounded bg-muted animate-pulse" />
              <div className="h-4 w-[200px] rounded bg-muted animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = subscription?.tier
    ? getTierInfo(subscription.tier).name
    : "Free Plan";
  const subscriptionStatus = subscription?.subscriptionStatus || "Inactive";
  const billingCycle = subscription?.billingCycle || "monthly";
  const subscriptionCurrency = subscription?.currency || DEFAULT_CURRENCY;
  const basePrice = (subscription?.basePriceCents ?? 0) / 100;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "-";
  const currentTierInfo = getTierInfo(currentTier);

  if (!isAdmin) {
    return (
      <Card >
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{tierName}</p>
            <Badge variant="secondary" className="capitalize">
              {subscriptionStatus}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Contact your facility administrator to manage subscription.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trialDaysLeft =
    subscriptionStatus === "TRIALING" && subscription?.currentPeriodEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";

  return (
    <div className="space-y-8">
      {trialDaysLeft !== null && (
        <Alert className="border-info/40 bg-info/10">
          <Clock className="h-4 w-4 text-info" />
          <AlertTitle>Free Trial Active</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free CORE trial.`
                : "Your free trial ends today"}{" "}
              Add payment details to keep your CORE features.
            </span>
            <Button
              size="sm"
              onClick={() => router.push("/upgrade")}
              className="shrink-0"
            >
              Add Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isPaymentDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Due</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your payment is overdue. Update your payment method to avoid
              service interruption.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/upgrade")}
              className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              Update Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Trial Expired</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your free trial has ended. Choose a plan to continue using
              Docita.
            </span>
            <Button
              size="sm"
              onClick={() => router.push("/upgrade")}
              className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
            >
              Choose a Plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="h-2 bg-linear-to-r from-info to-primary" />
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Current Plan</CardTitle>
          <CardDescription>
            Your active plan summary and billing history
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="space-y-1">
              <p className="font-semibold">Billing guidance</p>
              <p className="text-sm text-muted-foreground">
                For the complete feature comparison and every other plan detail,
                open the Upgrade page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => router.push("/upgrade")}>
                View Upgrade Page
              </Button>
              <WhatsAppButton
                phoneNumber={supportPhone}
                message="Hi Docita team, I need help with billing and onboarding"
                label="Message support"
                variant="default"
              />
            </div>
          </div>

          <CurrentPlanCard
            tierInfo={currentTierInfo}
            currentTier={currentTier}
            hasIntelligence={false}
            canChangeTier={isAdmin}
            onChangePlan={() => router.push("/upgrade")}
            onViewBillingHistory={() =>
              billingHistoryRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />

          <div className="rounded-xl border bg-background/60 p-4 md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Billing cycle</p>
                <p className="font-medium capitalize">
                  {billingCycle.toLowerCase().replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base price</p>
                <p className="font-medium">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: subscriptionCurrency,
                  }).format(basePrice)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Current period ends
                </p>
                <p className="font-medium">{periodEnd}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={billingHistoryRef} className="scroll-mt-6">
        <Card >
          <CardHeader>
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View and download past invoices</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BillingHistory />
          </CardContent>
        </Card>
      </div>

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        {...successData}
      />
    </div>
  );
}
