"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Baby,
  BarChart3,
  Bed,
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
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useSubscription } from "@/hooks/api/use-settings";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/app-config-context";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { type ClinicType, Feature } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";

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

// Base navigation items with feature mapping
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
    href: "/coding-queue",
    icon: FileText,
    label: "Coding Queue",
    feature: Feature.MEDICAL_CODING,
  },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// Icon mapping for specialty sections
const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Smile: SmilePlus,
  Baby: Baby,
  Heart: Heart,
  Eye: Eye,
  Brain: Activity,
};

// Specialty section URL mappings
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
  // Only admins can access the subscription endpoint (DOCTOR/RECEPTIONIST get 403)
  const canSeeSubscription =
    user?.role === "ADMIN" ||
    user?.role === "ADMIN_DOCTOR" ||
    user?.role === "SUPER_ADMIN";
  const { data: subscription } = useSubscription({ enabled: canSeeSubscription });
  const { getClinicSetting } = useAppConfig();
  const { canAccess } = usePermissionStore();

  // Get clinic type and specialty sections from ClinicFeatureService
  const clinicType = getClinicSetting("clinicType") as ClinicType | undefined;
  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);

  // Convert specialty sections to nav items
  const specialtyNavItems = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || Activity,
    label: section.label,
    // Specialty features don't have direct Feature enum mapping yet in this context
    // They are controlled by clinic type, but we could add specific features if needed
    feature: undefined,
  }));

  // Add Hospital Bed Management for supported types
  const hospitalNavItems: NavItem[] = [];
  if (clinicType === "SPECIALTY") {
    hospitalNavItems.push({
      href: "/hospital/beds",
      icon: Bed,
      label: "Bed Management",
      feature: undefined,
    });
  }

  // Combine base nav items with specialty items
  const allNavItems = [...navItems, ...specialtyNavItems, ...hospitalNavItems];

  // Only admins can see plan/upgrade section
  const canSeeUpgrade =
    user?.role === "ADMIN" ||
    user?.role === "ADMIN_DOCTOR" ||
    user?.role === "SUPER_ADMIN";

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
            // SUPER_ADMIN Restriction: Can only see Dashboard and Analytics
            if (user?.role === "SUPER_ADMIN") {
              return ["/dashboard", "/analytics"].includes(item.href);
            }

            // Hide features that are locked
            if (item.feature && !canAccess(item.feature)) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                )}
                {subscription?.tier === "pro" && (
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                )}
                {subscription?.tier === "enterprise" && (
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
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
