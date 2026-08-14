import { Calendar, ClipboardList, Files, ListChecks, Receipt, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { DashboardQuickActionsUI, QuickAction } from "./dashboard-quick-actions-ui";

interface DashboardQuickActionsContainerProps {
  uncodedVisits: number;
}

export function DashboardQuickActionsContainer({
  uncodedVisits,
}: DashboardQuickActionsContainerProps) {
  const { t } = useTranslation("Dashboard");
  const { canAccess } = usePermissionStore();

  const allActions = [
    {
      href: "/consultation",
      icon: ClipboardList,
      label: t("quickActions.opdQueue"),
      shortLabel: t("quickActions.queue"),
      feature: Feature.QUEUE_MANAGEMENT,
    },
    {
      href: "/patients?action=new",
      icon: UserPlus,
      label: t("quickActions.newPatient"),
      shortLabel: t("quickActions.patient"),
      feature: Feature.BASIC_PATIENT_MANAGEMENT,
    },
    {
      href: "/appointments?action=new",
      icon: Calendar,
      label: t("quickActions.schedule"),
      shortLabel: t("quickActions.visit"),
      feature: Feature.CALENDAR_SLOTS,
    },
    {
      href: "/documents",
      icon: Files,
      label: t("quickActions.documents"),
      shortLabel: t("quickActions.docs"),
      feature: Feature.DOCUMENT_ARCHIVAL,
    },
    {
      href: "/coding-queue",
      icon: ListChecks,
      label: t("quickActions.codingQueue"),
      shortLabel: t("quickActions.coding"),
      badge: uncodedVisits > 0 ? uncodedVisits : undefined,
      feature: Feature.MEDICAL_CODING,
    },
    {
      href: "/invoices",
      icon: Receipt,
      label: t("quickActions.invoices"),
      shortLabel: t("quickActions.bill"),
      feature: Feature.INVOICING,
    },
  ];

  const quickActions: QuickAction[] = allActions
    .filter((action) => canAccess(action.feature))
    .map(({ feature: _feature, ...rest }) => rest)
    .slice(0, 6);

  return <DashboardQuickActionsUI quickActions={quickActions} />;
}
