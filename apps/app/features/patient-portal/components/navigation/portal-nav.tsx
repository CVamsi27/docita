"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Calendar,
  FileText,
  LogOut,
  Pill,
  Receipt,
  Shield,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/lib/auth-context";
import { usePatientConsentSettings } from "@/hooks/api/use-patient-portal";
import { formatDate } from "@/lib/formatters";

const navigation = [
  { name: "Dashboard", href: "/portal", icon: User },
  { name: "Appointments", href: "/portal/appointments", icon: Calendar },
  { name: "Prescriptions", href: "/portal/prescriptions", icon: FileText },
  { name: "Medications", href: "/portal/medications", icon: Pill },
  { name: "Medical History", href: "/portal/history", icon: Activity },
  { name: "My Metrics", href: "/portal/metrics", icon: TrendingUp },
  { name: "Billing", href: "/portal/billing", icon: Receipt },
  { name: "Consent", href: "/portal/profile/consent-form", icon: Shield },
  { name: "Profile", href: "/portal/profile", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: consentSettings } = usePatientConsentSettings();

  const isItemActive = (href: string) =>
    href === "/portal"
      ? pathname === "/portal"
      : pathname === href || pathname.startsWith(`${href}/`);

  const consentUpdatedOn = consentSettings?.whatsappConsentAt
    ? formatDate(consentSettings.whatsappConsentAt, "en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <nav className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="ui-page-shell px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/portal" className="text-xl font-bold text-primary">
              Patient Portal
            </Link>
            <div className="hidden md:flex md:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{user?.name}</p>
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <span>Consent updated: {consentUpdatedOn || "Not yet"}</span>
                <Link
                  href="/portal/profile/consent-form"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="md:hidden pb-3">
          <div className="flex flex-wrap items-center gap-2 overflow-x-hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={`mobile-${item.name}`}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius)] px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
