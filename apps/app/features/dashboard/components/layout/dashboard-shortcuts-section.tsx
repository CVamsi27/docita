import { Section } from "@workspace/ui/components/layout/section";

import { DashboardQuickActionsContainer } from "@/features/dashboard/components/actions/dashboard-quick-actions-container";

interface DashboardShortcutsSectionProps {
  pendingReports: number;
}

export function DashboardShortcutsSection({
  pendingReports,
}: DashboardShortcutsSectionProps) {
  return (
    <Section id="dashboard-shortcuts" title="Shortcuts" compact>
      <DashboardQuickActionsContainer pendingReports={pendingReports} />
    </Section>
  );
}
