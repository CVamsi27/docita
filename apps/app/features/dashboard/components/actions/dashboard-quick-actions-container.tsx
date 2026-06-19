import {
  Calendar,
  ClipboardList,
  Files,
  ListChecks,
  Receipt,
  UserPlus,
} from "lucide-react";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import {
  DashboardQuickActionsUI,
  QuickAction,
} from "./dashboard-quick-actions-ui";

interface DashboardQuickActionsContainerProps {
  uncodedVisits: number;
}

export function DashboardQuickActionsContainer({
  uncodedVisits,
}: DashboardQuickActionsContainerProps) {
  const { canAccess } = usePermissionStore();

  const allActions = [
    {
      href: "/consultation",
      icon: ClipboardList,
      label: "OPD queue",
      shortLabel: "Queue",
      feature: Feature.QUEUE_MANAGEMENT,
    },
    {
      href: "/patients?action=new",
      icon: UserPlus,
      label: "New Patient",
      shortLabel: "Patient",
      feature: Feature.BASIC_PATIENT_MANAGEMENT,
    },
    {
      href: "/appointments?action=new",
      icon: Calendar,
      label: "Schedule",
      shortLabel: "Visit",
      feature: Feature.CALENDAR_SLOTS,
    },
    {
      href: "/documents",
      icon: Files,
      label: "Documents",
      shortLabel: "Docs",
      feature: Feature.DOCUMENT_ARCHIVAL,
    },
    {
      href: "/coding-queue",
      icon: ListChecks,
      label: "Coding queue",
      shortLabel: "Coding",
      badge: uncodedVisits > 0 ? uncodedVisits : undefined,
      feature: Feature.MEDICAL_CODING,
    },
    {
      href: "/invoices",
      icon: Receipt,
      label: "Invoices",
      shortLabel: "Bill",
      feature: Feature.INVOICING,
    },
  ];

  const quickActions: QuickAction[] = allActions
    .filter((action) => canAccess(action.feature))
    .map(({ feature: _feature, ...rest }) => rest)
    .slice(0, 6);

  return <DashboardQuickActionsUI quickActions={quickActions} />;
}
