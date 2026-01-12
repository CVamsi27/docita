import {
  Calendar,
  CalendarCheck,
  ClipboardList,
  Receipt,
  UserPlus,
} from "lucide-react";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import {
  DashboardQuickActionsUI,
  QuickAction,
} from "./DashboardQuickActionsUI";

interface DashboardQuickActionsContainerProps {
  pendingReports: number;
}

export function DashboardQuickActionsContainer({
  pendingReports,
}: DashboardQuickActionsContainerProps) {
  const { canAccess } = usePermissionStore();

  const allActions = [
    {
      href: "/patients?action=new",
      icon: UserPlus,
      label: "New Patient",
      shortLabel: "Patient",
      feature: Feature.BASIC_PATIENT_MANAGEMENT,
    },
    {
      href: "/queue",
      icon: CalendarCheck,
      label: "Today's Patients",
      shortLabel: "Today",
      feature: Feature.QUEUE_MANAGEMENT,
    },
    {
      href: "/appointments?action=new",
      icon: Calendar,
      label: "Schedule",
      shortLabel: "Visit",
      feature: Feature.CALENDAR_SLOTS,
    },
    {
      href: "/coding-queue",
      icon: ClipboardList,
      label: "Queue",
      shortLabel: "Queue",
      badge: pendingReports > 0 ? pendingReports : undefined,
      feature: Feature.MEDICAL_CODING,
    },
    {
      href: "/invoices",
      icon: Receipt,
      label: "Invoice",
      shortLabel: "Bill",
      feature: Feature.INVOICING,
    },
  ];

  const quickActions: QuickAction[] = allActions
    .filter((action) => canAccess(action.feature))
    .map(({ feature, ...rest }) => rest);

  return <DashboardQuickActionsUI quickActions={quickActions} />;
}
