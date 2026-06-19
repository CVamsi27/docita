import { Section } from "@workspace/ui/components/layout/section";

import { DashboardQuickActionsContainer } from "@/features/dashboard/components/actions/dashboard-quick-actions-container";

interface DashboardShortcutsSectionProps {
  uncodedVisits: number;
}

export function DashboardShortcutsSection({
  uncodedVisits,
}: DashboardShortcutsSectionProps) {
  return (
    <Section id="dashboard-shortcuts" title="Shortcuts" compact>
      <DashboardQuickActionsContainer uncodedVisits={uncodedVisits} />
    </Section>
  );
}
