"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { CreditCard, Loader2, TrendingUp } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface Clinic {
  id: string;
  name: string;
  tier: string;
  email: string;
  phone: string;
}

interface TierInfo {
  currentTier: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
  pricing: number;
}

interface TierPricing {
  tier: string;
  price: number;
  billingCycle: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
}

interface PaymentFormData {
  paymentMethod: string;
  amount: string;
  newTier: string;
  paymentNotes?: string;
}

export default function PaymentProcessingPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [tierPricing, setTierPricing] = useState<TierPricing[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { token, isSuperAdmin } = useAuth();
  const form = useForm<PaymentFormData>();

  const loadClinics = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/super-admin/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setClinics(data);
      }
    } catch (error) {
      console.error("Failed to load clinics", error);
      toast.error("Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  const loadTierPricing = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/super-admin/tier-pricing`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTierPricing(data.tiers);
      }
    } catch (error) {
      console.error("Failed to load tier pricing", error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && token) {
      loadClinics();
      loadTierPricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, token]);

  const loadClinicTierInfo = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${clinic.id}/tier-info`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setTierInfo(data);
        setSelectedClinic(clinic);
        setShowPaymentDialog(true);
        // Set default values
        form.reset({
          paymentMethod: "razorpay",
          newTier: clinic.tier,
          amount: data.pricing.toString(),
        });
      }
    } catch (error) {
      console.error("Failed to load tier info", error);
      toast.error("Failed to load tier information");
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedClinic || !token) return;

    setProcessingPayment(true);
    try {
      const res = await fetch(
        `${API_URL}/super-admin/clinics/${selectedClinic.id}/process-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId: `PAY_${Date.now()}`,
            amount: parseFloat(data.amount),
            currency: "INR",
            newTier: data.newTier,
            paymentMethod: data.paymentMethod,
            notes: data.paymentNotes,
          }),
        },
      );

      if (res.ok) {
        toast.success("Payment processed and tier updated successfully");
        setShowPaymentDialog(false);
        loadClinics();
        form.reset();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("Failed to process payment", error);
      toast.error("Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      CAPTURE: "bg-gray-100 text-gray-800",
      CORE: "bg-blue-100 text-blue-800",
      PLUS: "bg-purple-100 text-purple-800",
      PRO: "bg-orange-100 text-orange-800",
      ENTERPRISE: "bg-red-100 text-red-800",
    };
    return colors[tier] || "bg-gray-100 text-gray-800";
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payment Processing
        </h1>
        <p className="text-muted-foreground">
          Process payments and manage clinic tier upgrades
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Tier Pricing Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {tierPricing.map((tier) => (
              <Card key={tier.tier}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {tier.tier}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      ₹{tier.price === 0 ? "Free" : tier.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.billingCycle}
                    </p>
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs">
                        <strong>{tier.maxDoctors}</strong> doctors
                      </p>
                      <p className="text-xs">
                        <strong>{tier.maxPatients}</strong> patients
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Clinics List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Clinics Payment Management
              </CardTitle>
              <CardDescription>
                Select a clinic to process payment or upgrade tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clinics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clinics found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic Name</TableHead>
                      <TableHead>Current Tier</TableHead>
                      <TableHead>Max Doctors</TableHead>
                      <TableHead>Max Patients</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinics.map((clinic) => (
                      <TableRow key={clinic.id}>
                        <TableCell className="font-medium">
                          {clinic.name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTierBadgeColor(clinic.tier)}>
                            {clinic.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tierPricing.find((t) => t.tier === clinic.tier)
                            ?.maxDoctors || "-"}
                        </TableCell>
                        <TableCell>
                          {tierPricing.find((t) => t.tier === clinic.tier)
                            ?.maxPatients || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {clinic.email}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => loadClinicTierInfo(clinic)}
                            className="gap-2"
                          >
                            <TrendingUp className="h-4 w-4" />
                            Manage Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment Processing - {selectedClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Process payment and update clinic tier
            </DialogDescription>
          </DialogHeader>

          {tierInfo && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Tier
                  </p>
                  <Badge className={getTierBadgeColor(tierInfo.currentTier)}>
                    {tierInfo.currentTier}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Price
                  </p>
                  <p className="text-lg font-semibold">
                    ₹{tierInfo.pricing.toLocaleString()}
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="newTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upgrade to Tier</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const tierData = tierPricing.find(
                          (t) => t.tier === value,
                        );
                        if (tierData) {
                          form.setValue("amount", tierData.price.toString());
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tierPricing.map((tier) => (
                          <SelectItem key={tier.tier} value={tier.tier}>
                            {tier.tier} - ₹{tier.price.toLocaleString()}/
                            {tier.billingCycle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the new tier for this clinic
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (INR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormDescription>
                      Amount will be auto-calculated based on selected tier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add any notes about this payment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={processingPayment}>
                  {processingPayment && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {processingPayment ? "Processing..." : "Process Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
