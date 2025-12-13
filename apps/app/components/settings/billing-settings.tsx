"use client";

import { useEffect, useState } from "react";
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
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Separator } from "@workspace/ui/components/separator";
import { PaymentModal } from "./payment-modal";

interface PaymentHistory {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  invoiceUrl?: string;
  description?: string;
}

interface PaymentMethod {
  saved: boolean;
  methodType: "CARD" | "BANK_TRANSFER" | null;
  maskedToken?: string;
}

interface BillingInfo {
  subscription: {
    plan: string;
    billingCycle: string;
    status: string;
    currentPeriodEnd: string;
    priceCents: number;
    currency: string;
    cancelAtPeriodEnd: boolean;
    autoPayEnabled: boolean;
  } | null;
  daysRemaining: number;
  isInGrace: boolean;
  graceDaysRemaining?: number;
}

export function BillingSettings() {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const API_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";

  // Fetch billing details
  useEffect(() => {
    const fetchBillingDetails = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setError(null);

        const [billingRes, methodRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/subscription/billing`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/subscription/billing/payment-method`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/subscription/billing/payments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!billingRes.ok || !methodRes.ok || !historyRes.ok) {
          throw new Error("Failed to fetch billing details");
        }

        const billing = await billingRes.json();
        const method = await methodRes.json();
        const history = await historyRes.json();

        setBillingInfo(billing);
        setPaymentMethod(method);
        setPaymentHistory(history || []);
        setAutoPayEnabled(billing.subscription?.autoPayEnabled || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load billing");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingDetails();
  }, [token, API_URL]);

  const handleAutoPayToggle = async (enabled: boolean) => {
    if (enabled && !paymentMethod?.saved) {
      setError("Please save a payment method before enabling auto-pay");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch(`${API_URL}/subscription/billing/auto-pay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update auto-pay setting");
      }

      setAutoPayEnabled(enabled);
      setSuccess(
        enabled
          ? "Auto-pay enabled successfully"
          : "Auto-pay disabled successfully",
      );

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update auto-pay",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSuccess("Payment successful! Your invoice has been sent to your email.");
    setTimeout(() => setSuccess(null), 5000);

    // Refresh payment history
    const refreshHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/subscription/billing/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const history = await res.json();
          setPaymentHistory(history || []);
        }
      } catch (err) {
        console.error("Failed to refresh payment history", err);
      }
    };

    refreshHistory();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading billing details...</div>
        </CardContent>
      </Card>
    );
  }

  const subscription = billingInfo?.subscription;
  const renewalDate = subscription
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const formattedRenewalDate = renewalDate?.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Grace Period Alert */}
      {billingInfo?.isInGrace && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">
            Your payment is overdue. Please make payment within{" "}
            {billingInfo.graceDaysRemaining} days to avoid suspension.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Card */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Subscription</span>
              <Badge
                variant={
                  subscription.status === "ACTIVE" ? "default" : "secondary"
                }
              >
                {subscription.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="text-lg font-semibold">
                  {subscription.billingCycle === "MONTHLY"
                    ? "Monthly"
                    : "Yearly"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-lg font-semibold">
                  ₹{(subscription.priceCents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Billing</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formattedRenewalDate}
                </p>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-600">
                  Your subscription will end on {formattedRenewalDate}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Payment Method Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            {paymentMethod?.saved
              ? `Saved ${paymentMethod.methodType}`
              : "No payment method saved"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod?.saved ? (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{paymentMethod.methodType}</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod.maskedToken}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentModal(true)}
              >
                Change
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Save a payment method to enable auto-pay and make quick payments
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Auto-Pay Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Auto-Pay
            </span>
            <Button
              variant={autoPayEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => handleAutoPayToggle(!autoPayEnabled)}
              disabled={isUpdating || !paymentMethod?.saved}
            >
              {autoPayEnabled ? "Enabled" : "Enable"}
            </Button>
          </CardTitle>
          <CardDescription>
            Automatically renew your subscription on the renewal date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autoPayEnabled ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Auto-pay is enabled. Your subscription will renew automatically
                on {formattedRenewalDate}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600">
                {!paymentMethod?.saved
                  ? "Please save a payment method to enable auto-pay"
                  : "Auto-pay is disabled. Enable it to avoid manual payments"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Make Payment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Make Payment</CardTitle>
          <CardDescription>
            Make an immediate payment or advance payment toward your
            subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowPaymentModal(true)} className="w-full">
            Make Payment
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments made toward your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString(
                            "en-IN",
                          )}
                        </TableCell>
                        <TableCell>
                          ₹{(payment.amountCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "paid"
                                ? "default"
                                : payment.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            {payment.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-blue-600"
                                onClick={() => {
                                  setShowPaymentModal(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                                Retry
                              </Button>
                            )}
                            {payment.invoiceUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(payment.invoiceUrl, "_blank")
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
