"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import { useEstimate, usePricingConfig } from "@/hooks/api/use-pricing";

export function DynamicPricingEstimator() {
  const [tier, setTier] = useState("CORE");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [patients, setPatients] = useState(300);
  const [appointments, setAppointments] = useState(500);
  const [users, setUsers] = useState(1);
  const [intelligence, setIntelligence] = useState(false);
  const [aiCredits, setAiCredits] = useState(0);

  const { pricingConfig } = usePricingConfig("INR");

  const estimateParams = useMemo(
    () => ({
      tier,
      billingCycle,
      patients,
      appointments,
      users,
      intelligence,
      aiCredits: intelligence ? aiCredits : 0,
    }),
    [
      tier,
      billingCycle,
      patients,
      appointments,
      users,
      intelligence,
      aiCredits,
    ],
  );

  const { estimate, isLoading } = useEstimate(estimateParams);

  const tiers = (pricingConfig?.tiers || [])
    .map((tierInfo) => tierInfo.id)
    .filter(
      (tierInfo) => tierInfo !== "CAPTURE" && tierInfo !== "INTELLIGENCE",
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate Your Monthly Cost</CardTitle>
        <CardDescription>
          Set your expected usage to get an instant estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tierName) => (
                  <SelectItem key={tierName} value={tierName}>
                    {tierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Expected Patients</Label>
            <Input
              type="number"
              min={0}
              value={patients}
              onChange={(e) => setPatients(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Appointments / Month</Label>
            <Input
              type="number"
              min={0}
              value={appointments}
              onChange={(e) => setAppointments(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Team Members</Label>
            <Input
              type="number"
              min={1}
              value={users}
              onChange={(e) => setUsers(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Include Docita Intelligence</p>
              <p className="text-xs text-muted-foreground">
                Optional AI credits for coding and automation
              </p>
            </div>
            <Switch checked={intelligence} onCheckedChange={setIntelligence} />
          </div>
          {intelligence && (
            <div className="space-y-2">
              <Label>Projected AI Credits / Month</Label>
              <Input
                type="number"
                min={0}
                value={aiCredits}
                onChange={(e) => setAiCredits(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your estimate</span>
            {isLoading ? (
              <Badge variant="outline">Calculating...</Badge>
            ) : (
              <Badge>
                {estimate?.currency?.symbol || "₹"}
                {(estimate?.totalMonthly || 0).toLocaleString()}/mo
              </Badge>
            )}
          </div>
          {!isLoading && estimate && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Base: {estimate.currency.symbol}
                {estimate.breakdown.basePrice.toLocaleString()}
              </p>
              <p>
                Add-ons: {estimate.currency.symbol}
                {estimate.breakdown.addOnTotal.toLocaleString()}
              </p>
              <p>
                Usage overage: {estimate.currency.symbol}
                {estimate.breakdown.overageTotal.toLocaleString()}
              </p>
              <div className="pt-2 space-y-1 border-t">
                <p className="font-medium text-foreground">
                  Total (monthly): {estimate.currency.symbol}
                  {estimate.totalMonthly.toLocaleString()}
                </p>
                <p className="font-medium text-foreground">
                  Total (yearly): {estimate.currency.symbol}
                  {estimate.totalYearly.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Preferred billing view</Label>
          <Select
            value={billingCycle}
            onValueChange={(value) =>
              setBillingCycle(value as "monthly" | "yearly")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {!isLoading && estimate && (
            <p className="text-xs text-muted-foreground">
              {billingCycle === "yearly"
                ? `Shown yearly total: ${estimate.currency.symbol}${estimate.totalYearly.toLocaleString()}`
                : `Shown monthly total: ${estimate.currency.symbol}${estimate.totalMonthly.toLocaleString()}`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
