export interface PlanFeature {
  feature: string;
  details: { name: string; description: string; icon?: React.ComponentType<{ className?: string }> };
  hasAccess: boolean;
}
