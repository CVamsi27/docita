import { Crown, CreditCard, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { type CurrentPlanCardProps, TIER_COLOR_MAP } from "./current-plan-card-types";
import { CurrentPlanCardMeta } from "./current-plan-card-meta";
import { CurrentPlanCardUsage } from "./current-plan-card-usage";


export function CurrentPlanCard({
  tierInfo,
  currentTier: _currentTier,
  hasIntelligence,
  canChangeTier,
  onChangePlan,
  onViewBillingHistory,
  onRenewNow,
  renewActionLabel,
  emphasizeRenew = false,
  isRenewProcessing = false,
  scheduledChange,
  accountCreditCents = 0,
  accountCreditCurrency,
  planDetails,
  planDetailsFootnote,
  usage,
  isUsageLoading,
  hasUsageError,
  statusNotice,
  showWhatsAppUsageMeter = true,
}: CurrentPlanCardProps) {
  const { t } = useTranslation("Subscription.currentPlanCard");
  const colors = TIER_COLOR_MAP[tierInfo.color] ?? TIER_COLOR_MAP.gray;

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", colors.gradient)}>
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{t("planTitle", { tier: tierInfo.name })}</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={cn("text-sm px-3 py-1", colors.badge)}>{t("currentPlanBadge")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {canChangeTier ? (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {onRenewNow ? (
              <Button onClick={onRenewNow} disabled={isRenewProcessing} size="lg"
                className={cn("h-11 gap-2", emphasizeRenew && "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90")}>
                <CreditCard className="h-4 w-4" />
                {isRenewProcessing ? t("openingCheckout") : (renewActionLabel ?? t("payForNextCycle"))}
              </Button>
            ) : null}
            <Button variant={onRenewNow ? "outline" : "default"} onClick={onChangePlan} size="lg" className="h-11 gap-2">
              <TrendingUp className="h-4 w-4" />
              {onRenewNow ? t("changePlan") : t("choosePlan")}
            </Button>
            <Button variant="outline" size="lg" className="h-11" onClick={onViewBillingHistory}>
              <Receipt className="mr-2 h-4 w-4" />{t("billingHistory")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("contactAdminToChange")}</p>
        )}

        <CurrentPlanCardMeta
          scheduledChange={scheduledChange}
          accountCreditCents={accountCreditCents}
          accountCreditCurrency={accountCreditCurrency}
          planDetails={planDetails}
          planDetailsFootnote={planDetailsFootnote}
          statusNotice={statusNotice}
        />

        <CurrentPlanCardUsage usage={usage} isUsageLoading={isUsageLoading} hasUsageError={hasUsageError} showWhatsAppUsageMeter={showWhatsAppUsageMeter} />

        {hasIntelligence ? (
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{t("aiFeaturesActive")}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
