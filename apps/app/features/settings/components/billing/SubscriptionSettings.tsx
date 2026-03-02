"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTierInfo } from "@/lib/tier-config";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSubscription } from "@/hooks/api/use-settings";
import { DynamicPricingEstimator } from "@/features/subscription/components/pricing/dynamic-pricing-estimator";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
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
import { Download, FileText, Loader2 } from "lucide-react";
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
      const currency = invoice.currency || "INR";
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
      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
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
  const { currentTier, hasIntelligence } = usePermissionStore();
  const { data: subscription, isLoading } = useSubscription();
  const billingHistoryRef = useRef<HTMLDivElement>(null);

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
  const billingCycle = subscription?.billingCycle || "monthly";
  const currency = subscription?.currency || "INR";
  const basePrice = (subscription?.basePriceCents ?? 0) / 100;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN")
    : "-";
  const currentTierInfo = getTierInfo(currentTier);

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

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-2 bg-linear-to-r from-info to-primary" />
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Current Plan</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <CurrentPlanCard
            tierInfo={currentTierInfo}
            currentTier={currentTier}
            hasIntelligence={hasIntelligence}
            canChangeTier={isAdmin}
            onChangePlan={() => router.push("/upgrade")}
            onViewBillingHistory={() =>
              billingHistoryRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-6 border space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Active Subscription
                </p>
                <h3 className="text-3xl font-black text-foreground">{tierName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Billing cycle</p>
                    <p className="font-medium capitalize">
                      {billingCycle.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base price</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency,
                      }).format(basePrice)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Current period ends</p>
                    <p className="font-medium">{periodEnd}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-black hover:bg-black/90 text-white"
                  onClick={() => router.push("/upgrade")}
                >
                  Open Upgrade &amp; Billing
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4">Plan Estimator</h4>
              <DynamicPricingEstimator />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card ref={billingHistoryRef} className="border-none shadow-lg">
        <CardHeader>
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View and download past invoices
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BillingHistory />
        </CardContent>
      </Card>
    </div>
  );
}
