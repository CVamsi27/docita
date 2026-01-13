"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

export function BillingSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>Configure billing and payment options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Default Tax Rate (%)</Label>
          <Input type="number" defaultValue="18" />
        </div>
        <div className="space-y-2">
          <Label>Invoice Prefix</Label>
          <Input defaultValue="INV-" />
        </div>
        <div className="space-y-2">
          <Label>Payment Terms (days)</Label>
          <Input type="number" defaultValue="7" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Online Payments</Label>
            <p className="text-sm text-muted-foreground">Accept payments via Razorpay</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Button className="w-full">Save Billing Settings</Button>
      </CardContent>
    </Card>
  );
}
