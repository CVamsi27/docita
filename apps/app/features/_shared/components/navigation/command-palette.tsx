"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStartConsultation, useQueueByDoctor } from "@/hooks/api/use-appointments";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Calendar,
  FileText,
  Home,
  Package,
  PlusCircle,
  Receipt,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { APP_ACCESS_TARGETS } from "@workspace/types";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: Calendar,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  { label: "Today's Queue", href: "/consultation", icon: Stethoscope },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVENTORY,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
  },
  { label: "Settings", href: "/settings", icon: Settings },
];

const quickActions = [
  {
    label: "New Patient",
    action: "/patients?new=true",
    icon: PlusCircle,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    label: "New Appointment",
    action: "/appointments?new=true",
    icon: PlusCircle,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  { label: "Start Consultation", action: "/consultation", icon: Stethoscope },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess } = usePermissionStore();
  const startConsultation = useStartConsultation();
  const doctorQueue = useQueueByDoctor(
    canStartConsultation ? user?.id : undefined,
    undefined,
    open && canStartConsultation && !!user?.id,
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (!("accessTarget" in item) || !item.accessTarget) {
          return true;
        }
        return canAccessTarget(
          item.accessTarget,
          {
            role: user?.role,
            canAccessFeature: canAccess,
          },
          "read",
        );
      }),
    [canAccess, user?.role],
  );

  const filteredQuickActions = useMemo(() => {
    return quickActions.filter((action) => {
      if ("accessTarget" in action && action.accessTarget) {
        const hasTargetAccess = canAccessTarget(
          action.accessTarget,
          {
            role: user?.role,
            canAccessFeature: canAccess,
          },
          "write",
        );
        if (!hasTargetAccess) return false;
      }

      if (action.label === "Start Consultation" && !canStartConsultation) {
        return false;
      }

      return true;
    });
  }, [canAccess, canStartConsultation, user?.role]);

  const runCommand = useCallback((command: () => void | Promise<void>) => {
    setOpen(false);
    void command();
  }, []);

  const handleStartConsultation = useCallback(async () => {
    const queueItems = doctorQueue.data ?? [];
    const inProgressAppointmentId = queueItems.find(
      (item) =>
        item.appointmentId && item.status.toUpperCase() === "IN_PROGRESS",
    )?.appointmentId;
    const waitingAppointmentId = queueItems.find(
      (item) => item.appointmentId && item.status.toUpperCase() === "WAITING",
    )?.appointmentId;
    const appointmentId = inProgressAppointmentId ?? waitingAppointmentId;

    if (!appointmentId) {
      router.push("/consultation");
      return;
    }

    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start this consultation",
      );
      router.push("/consultation");
    }
  }, [doctorQueue.data, router, startConsultation]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {filteredNavigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick Actions">
          {filteredQuickActions.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() =>
                runCommand(() =>
                  item.label === "Start Consultation"
                    ? handleStartConsultation()
                    : router.push(item.action),
                )
              }
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
