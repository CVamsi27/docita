"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export function SubscriptionSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Pro Plan</p>
              <p className="text-sm text-muted-foreground">
                ₹2,499/month • Renews Jan 15
              </p>
            </div>
            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
              Active
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Patients</p>
            <p className="text-lg font-bold">247 / Unlimited</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Storage</p>
            <p className="text-lg font-bold">2.3 GB / 10 GB</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            Manage Billing
          </Button>
          <Button className="flex-1">Upgrade Plan</Button>
        </div>
      </CardContent>
    </Card>
  );
}
