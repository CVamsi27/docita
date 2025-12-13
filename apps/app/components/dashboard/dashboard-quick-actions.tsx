"use client";

import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  ClipboardList,
  Receipt,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";

interface DashboardQuickActionsProps {
  pendingReports: number;
}

export function DashboardQuickActions({
  pendingReports,
}: DashboardQuickActionsProps) {
  const { canAccess } = usePermissionStore();

  const quickActions = [
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
  ].filter((action) => canAccess(action.feature));

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
      <div className="flex items-center gap-1.5 bg-muted/50 rounded-full p-1 shrink-0">
        {quickActions.map((action, idx) => (
          <Button
            key={action.href}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-1.5 rounded-full text-xs font-medium relative",
              idx === 0 &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
          >
            <Link href={action.href}>
              <action.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.shortLabel}</span>
              {action.badge && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {action.badge}
                </span>
              )}
            </Link>
          </Button>
        ))}
      </div>
      <div className="h-6 w-px bg-border shrink-0 hidden md:block" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs shrink-0"
        asChild
      >
        <Link href="/patients">
          <Users className="h-3.5 w-3.5" />
          All Patients
        </Link>
      </Button>
      {canAccess(Feature.CALENDAR_SLOTS) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full text-xs shrink-0"
          asChild
        >
          <Link href="/appointments">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </Link>
        </Button>
      )}
    </div>
  );
}
