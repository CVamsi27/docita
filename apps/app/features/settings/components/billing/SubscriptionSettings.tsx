"use client";

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
                    invoice.status === "paid"
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
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Current Plan</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </div>
          <Badge className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
            {subscriptionStatus.toUpperCase()}
          </Badge>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-6 border">
                <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                  Active Tier
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-foreground">
                    {tierName}
                  </h3>
                  {tierName !== "Enterprise" && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Billed Monthly
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "Unlimited Patients",
                    "Advanced Analytics",
                    "Priority Support",
                    "Cloud Backup",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-black hover:bg-black/90 text-white"
                  onClick={() => router.push("/subscription/upgrade")}
                >
                  Change Plan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/subscription/manage")}
                >
                  Cancel Plan
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  Quick Links
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start h-auto py-3 px-4 border hover:bg-muted/50"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm">Payment Methods</p>
                      <p className="text-xs text-muted-foreground">
                        Manage cards and bank accounts
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start h-auto py-3 px-4 border hover:bg-muted/50"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm">Billing Address</p>
                      <p className="text-xs text-muted-foreground">
                        Update tax and invoice details
                      </p>
                    </div>
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4">Plan Estimator</h4>
                <DynamicPricingEstimator compact />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download past invoices
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export All CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BillingHistory />
        </CardContent>
      </Card>
    </div>
  );
}
