"use client"

import { usePermissionStore } from "@/lib/stores/permission-store"
import { 
  Tier, 
  Feature, 
  FEATURE_TIER_MAP, 
  FEATURE_DISPLAY,
  getTierInfo,
} from "@/lib/tier-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { 
  Check, 
  Lock, 
  Sparkles, 
  ArrowRight,
  MessageSquare,
  Users,
  BarChart3,
  ScanLine,
  FileText,
  Calendar,
  Receipt,
  Package,
  FlaskConical,
  Ticket,
  Upload,
  Shield,
  Zap,
  Building2,
  Brain,
  LucideIcon
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

// Icon mapping for features - uses FEATURE_DISPLAY from tier-config for names/descriptions
const FEATURE_ICONS: Record<Feature, LucideIcon> = {
  // Tier 0: CAPTURE
  [Feature.PAPER_SCANNING]: ScanLine,
  [Feature.EXCEL_IMPORT]: Upload,
  [Feature.PATIENT_DEDUPLICATION]: Users,
  [Feature.BASIC_PATIENT_MANAGEMENT]: Users,
  [Feature.DOCUMENT_ARCHIVAL]: FileText,
  [Feature.EXPORT_CSV]: Upload,
  [Feature.OCR_BASIC]: ScanLine,

  // Tier 1: CORE
  [Feature.CALENDAR_SLOTS]: Calendar,
  [Feature.VISIT_HISTORY]: FileText,
  [Feature.MEDICINES_LIST]: Package,
  [Feature.INVOICING]: Receipt,
  [Feature.DIGITAL_PRESCRIPTIONS]: FileText,
  [Feature.ONE_WAY_WHATSAPP]: MessageSquare,
  [Feature.BASIC_ANALYTICS]: BarChart3,
  [Feature.MEDICAL_CODING]: FileText,

  // Tier 2: PLUS
  [Feature.WHATSAPP_API]: MessageSquare,
  [Feature.AUTO_REMINDERS]: Calendar,
  [Feature.PAYMENT_LINKS]: Receipt,
  [Feature.TWO_WAY_WHATSAPP]: MessageSquare,
  [Feature.PRESCRIPTION_TEMPLATES]: FileText,
  [Feature.MULTI_DEVICE]: Shield,
  [Feature.ROLE_MANAGEMENT]: Users,
  [Feature.CONSENT_MANAGEMENT]: Shield,
  [Feature.DOCTOR_SIGNATURE]: FileText,

  // Tier 3: PRO
  [Feature.MULTI_DOCTOR]: Users,
  [Feature.MULTI_CLINIC]: Building2,
  [Feature.LAB_TESTS]: FlaskConical,
  [Feature.INVENTORY]: Package,
  [Feature.QUEUE_MANAGEMENT]: Ticket,
  [Feature.AUDIT_LOGS]: Shield,
  [Feature.INSURANCE_BILLING]: Receipt,
  [Feature.DIGITAL_INTAKE_FORMS]: FileText,
  [Feature.BROADCAST_CAMPAIGNS]: MessageSquare,
  [Feature.OCR_ADVANCED]: ScanLine,
  [Feature.ADVANCED_ANALYTICS]: BarChart3,

  // Tier 4: ENTERPRISE
  [Feature.FULL_EHR]: FileText,
  [Feature.API_ACCESS]: Zap,
  [Feature.MULTI_LOCATION_ANALYTICS]: BarChart3,
  [Feature.CUSTOM_BRANDING]: Building2,
  [Feature.DATA_WAREHOUSE_EXPORT]: Upload,
  [Feature.SSO]: Shield,
  [Feature.WHATSAPP_CHATBOTS]: MessageSquare,
  [Feature.BULK_IMPORT_SUITE]: Upload,

  // Tier 5: INTELLIGENCE
  [Feature.AI_PRESCRIPTION_ASSISTANT]: Brain,
  [Feature.AI_DIAGNOSIS_HINTS]: Brain,
  [Feature.SMART_TASK_ENGINE]: Zap,
  [Feature.PREDICTIVE_NO_SHOW]: Calendar,
  [Feature.PATIENT_SEGMENTATION]: Users,
  [Feature.ANOMALY_DETECTION]: Shield,
}

// Helper to get feature details from single source of truth
function getFeatureDetails(feature: Feature) {
  const display = FEATURE_DISPLAY[feature]
  return {
    name: display?.name || feature,
    description: display?.description || '',
    icon: FEATURE_ICONS[feature] || Lock
  }
}

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess } = usePermissionStore()

  // Get all features grouped by tier
  const featuresByTier = Object.values(Tier)
    .filter((t): t is Tier => typeof t === 'number')
    .map(tier => ({
      tier,
      info: getTierInfo(tier),
      features: Object.entries(FEATURE_TIER_MAP)
        .filter(([, requiredTier]) => requiredTier === tier)
        .map(([feature]) => ({
          feature: feature as Feature,
          details: getFeatureDetails(feature as Feature),
          hasAccess: canAccess(feature as Feature)
        }))
    }))

  // Get locked features for current tier
  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([feature]) => !canAccess(feature as Feature))
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature)
    }))

  const nextTier = currentTier < Tier.ENTERPRISE ? currentTier + 1 : null
  const nextTierInfo = nextTier !== null ? getTierInfo(nextTier) : null

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upgrade Your Plan</h1>
        <p className="text-muted-foreground">
          Unlock powerful features to grow your practice
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan: {getTierInfo(currentTier).name}</CardTitle>
              <CardDescription>{getTierInfo(currentTier).description}</CardDescription>
            </div>
            <Badge variant="secondary" className={cn(
              "text-sm",
              getTierInfo(currentTier).color === 'gray' && "bg-gray-100 text-gray-700",
              getTierInfo(currentTier).color === 'blue' && "bg-blue-100 text-blue-700",
              getTierInfo(currentTier).color === 'green' && "bg-green-100 text-green-700",
              getTierInfo(currentTier).color === 'purple' && "bg-purple-100 text-purple-700",
              getTierInfo(currentTier).color === 'orange' && "bg-orange-100 text-orange-700",
            )}>
              Tier {currentTier}
            </Badge>
          </div>
        </CardHeader>
        {hasIntelligence && (
          <CardContent>
            <div className="flex items-center gap-2 text-pink-600">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Intelligence Add-on Active</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Locked Features Summary */}
      {lockedFeatures.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              {lockedFeatures.length} Features Locked
            </CardTitle>
            <CardDescription>
              Upgrade to unlock these features and supercharge your practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lockedFeatures.slice(0, 6).map(({ feature, details, requiredTier }) => {
                const Icon = details.icon
                return (
                  <div 
                    key={feature}
                    className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3 dark:bg-gray-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <Icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{details.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Requires {getTierInfo(requiredTier).name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {lockedFeatures.length > 6 && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                +{lockedFeatures.length - 6} more features available in higher tiers
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Tier Promotion */}
      {nextTier !== null && nextTierInfo && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Upgrade to {nextTierInfo.name}
                  <ArrowRight className="h-5 w-5" />
                </CardTitle>
                <CardDescription>{nextTierInfo.description}</CardDescription>
              </div>
              <Button>
                Contact Sales
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {featuresByTier
                .find(t => t.tier === nextTier)
                ?.features.slice(0, 6).map(({ feature, details }) => {
                  const Icon = details.icon
                  return (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{details.name}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intelligence Add-on */}
      {!hasIntelligence && (
        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  Docita Intelligence
                </CardTitle>
                <CardDescription>AI-Powered Add-on for any tier</CardDescription>
              </div>
              <Badge className="bg-pink-500 hover:bg-pink-600">AI Add-on</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {featuresByTier
                .find(t => t.tier === Tier.INTELLIGENCE)
                ?.features.map(({ feature, details }) => {
                  const Icon = details.icon
                  return (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50">
                        <Icon className="h-4 w-4 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{details.name}</p>
                        <p className="text-xs text-muted-foreground">{details.description}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tiers Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Plans & Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuresByTier
            .filter(t => t.tier !== Tier.INTELLIGENCE)
            .map(({ tier, info, features }) => {
              const isCurrentTier = tier === currentTier
              const isLocked = tier > currentTier
              
              return (
                <Card 
                  key={tier}
                  className={cn(
                    "relative overflow-hidden",
                    isCurrentTier && "border-primary ring-2 ring-primary/20",
                    isLocked && "opacity-75"
                  )}
                >
                  {isCurrentTier && (
                    <div className="absolute top-0 right-0 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-bl-lg">
                      Current
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-3 w-3 rounded-full",
                        info.color === 'gray' && "bg-gray-500",
                        info.color === 'blue' && "bg-blue-500",
                        info.color === 'green' && "bg-green-500",
                        info.color === 'purple' && "bg-purple-500",
                        info.color === 'orange' && "bg-orange-500",
                      )}/>
                      <CardTitle className="text-base">{info.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {features.slice(0, 5).map(({ feature, details, hasAccess }) => (
                          <div 
                            key={feature} 
                            className={cn(
                              "flex items-center gap-2 text-sm",
                              !hasAccess && "text-muted-foreground"
                            )}
                          >
                            {hasAccess ? (
                              <Check className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{details.name}</span>
                          </div>
                        ))}
                      {features.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-6">
                          +{features.length - 5} more features
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>

      {/* Contact CTA */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div>
            <h3 className="text-lg font-semibold">Need help choosing?</h3>
            <p className="text-sm text-muted-foreground">
              Our team can help you find the perfect plan for your practice
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">View Pricing</Button>
            <Button>Contact Sales</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
