import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/api/use-settings";
import { useBillingStatus } from "@/hooks/api/use-billing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export function SubscriptionSettings() {
  const router = useRouter();
  const { data: subscription, isLoading } = useSubscription();
  const { data: billingStatus } = useBillingStatus();

  if (isLoading) {
    return <div>Loading subscription details...</div>;
  }

  const tierName = subscription?.tierName || "Free Plan";
  const price = billingStatus?.subscription?.scheduledChange?.tier 
    ? "Changing soon"
    : `${billingStatus?.lastPayment?.currency || "₹"} ${billingStatus?.lastPayment?.amount || 0}/month`;
  
  const renewsAt = billingStatus?.subscription?.currentPeriodEnd 
    ? new Date(billingStatus.subscription.currentPeriodEnd).toLocaleDateString()
    : "N/A";

  const isPro = subscription?.tier === "pro" || subscription?.tier === "enterprise";

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
              <p className="font-bold text-lg">{tierName}</p>
              <p className="text-sm text-muted-foreground">
                {price} • Renews {renewsAt}
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              subscription?.subscriptionStatus === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {subscription?.subscriptionStatus || "Inactive"}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* <Button variant="outline" className="flex-1">
            Manage Billing
          </Button> */}
          {/* Billing often handled in separate tab or portal. 
              If there is a billing portal URL, we'd use it here. 
              For now, we can link to invoices or just show upgrade. */}
          
          <Button 
            className="flex-1" 
            onClick={() => router.push("/upgrade")}
          >
            {isPro ? "Change Plan" : "Upgrade Plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
