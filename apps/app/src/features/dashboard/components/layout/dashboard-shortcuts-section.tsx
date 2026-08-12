import { useTranslation } from "react-i18next";
import { Section } from "@workspace/ui/components/layout/section";

import { DashboardQuickActionsContainer } from "@/features/dashboard/components/actions/dashboard-quick-actions-container";

interface DashboardShortcutsSectionProps {
  uncodedVisits: number;
}

export function DashboardShortcutsSection({
  uncodedVisits,
}: DashboardShortcutsSectionProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <Section id="dashboard-shortcuts" title={t("shortcuts.title")} compact>
      <DashboardQuickActionsContainer uncodedVisits={uncodedVisits} />
    </Section>
  );
}
