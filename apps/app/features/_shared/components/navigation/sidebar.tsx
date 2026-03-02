"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Baby,
  BarChart3,
  Bed,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  Home,
  type LucideIcon,
  Package,
  Pill,
  Receipt,
  Settings,
  SmilePlus,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useSubscription } from "@/hooks/api/use-settings";
import { useUnreadNotificationCount } from "@/hooks/api/use-whatsapp";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/app-config-context";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { type ClinicType, Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { CLINIC_ADMIN_ROLES } from "@/lib/permissions";

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  feature?: Feature;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  {
    href: "/appointments",
    icon: Calendar,
    label: "Appointments",
    feature: Feature.CALENDAR_SLOTS,
  },
  { href: "/consultation", icon: Stethoscope, label: "Consultation" },
  {
    href: "/prescriptions",
    icon: Pill,
    label: "Prescriptions",
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  {
    href: "/lab-tests",
    icon: FlaskConical,
    label: "Lab Tests",
    feature: Feature.LAB_TESTS,
  },
  {
    href: "/invoices",
    icon: Receipt,
    label: "Invoices",
    feature: Feature.INVOICING,
  },
  {
    href: "/inventory",
    icon: Package,
    label: "Inventory",
    feature: Feature.INVENTORY,
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  {
    href: "/analytics",
    icon: BarChart3,
    label: "Analytics",
    feature: Feature.BASIC_ANALYTICS,
  },
  {
    href: "/settings?tab=notification-feed",
    icon: Bell,
    label: "Notifications",
  },
  {
    href: "/coding-queue",
    icon: FileText,
    label: "Coding Queue",
    feature: Feature.MEDICAL_CODING,
  },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Smile: SmilePlus,
  Baby: Baby,
  Heart: Heart,
  Eye: Eye,
  Brain: Activity,
};

const SPECIALTY_URLS: Record<string, string> = {
  "dental-chart": "/specialty/dental-charts",
  "growth-chart": "/specialty/growth-charts",
  "vision-exam": "/specialty/vision-tests",
  "ecg-monitoring": "/specialty/ecg-monitoring",
  "prenatal-care": "/specialty/prenatal-care",
  "mental-health": "/specialty/mental-health",
};

export function Sidebar({
  isCollapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const canSeeSubscription = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);
  const { data: subscription } = useSubscription({
    enabled: canSeeSubscription,
  });
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const { getClinicSetting } = useAppConfig();
  const { canAccess } = usePermissionStore();
  const notificationCount = unreadNotificationCount?.count ?? 0;

  const clinicType = getClinicSetting("clinicType") as ClinicType | undefined;
  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);

  const specialtyNavItems = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || Activity,
    label: section.label,

    feature: undefined,
  }));

  const hospitalNavItems: NavItem[] = [];
  if (clinicType === "SPECIALTY") {
    hospitalNavItems.push({
      href: "/hospital/beds",
      icon: Bed,
      label: "Bed Management",
      feature: undefined,
    });
  }

  const allNavItems = [...navItems, ...specialtyNavItems, ...hospitalNavItems];

  const canSeeUpgrade = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950 border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <DocitaLogo />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          className="h-8 w-8"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {allNavItems
          .filter((item) => {

            if (item.feature && !canAccess(item.feature)) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const isActive =
              (item.href.startsWith("/settings?") &&
                pathname === "/settings") ||
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-2",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed &&
                  item.href.startsWith("/settings?tab=notification-feed") &&
                  notificationCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto px-1.5 min-w-5 h-5 text-[10px]"
                    >
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Badge>
                  )}
              </Link>
            );
          })}
      </nav>

      {canSeeUpgrade && (
        <div className="p-4 border-t mt-auto">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    Plan
                  </p>
                  <p className="text-sm font-medium truncate">
                    {subscription?.tierName || "Loading..."}
                  </p>
                </div>
                {subscription?.tier === "free" && (
                  <div className="h-2 w-2 rounded-full bg-warning" />
                )}
                {subscription?.tier === "pro" && (
                  <div className="h-2 w-2 rounded-full bg-info" />
                )}
                {subscription?.tier === "enterprise" && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <Button
                className="w-full gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                size="sm"
                asChild
              >
                <Link href="/upgrade">
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              title="Upgrade Plan"
              asChild
            >
              <Link href="/upgrade">
                <Sparkles className="h-5 w-5 text-primary" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
