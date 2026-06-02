"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  Calendar,
  FileText,
  LogOut,
  MoreHorizontal,
  Pill,
  Receipt,
  Shield,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { usePatientConsentSettings } from "@workspace/data-access";
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

const primaryMobileNav = navigation.slice(0, 4);
const secondaryMobileNav = navigation.slice(4);

function NavLink({
  item,
  isActive,
  compact = false,
  onNavigate,
}: {
  item: (typeof navigation)[number];
  isActive: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] font-medium transition-colors",
        compact ? "px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2 text-sm",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {item.name}
    </Link>
  );
}

export function PortalNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: consentSettings } = usePatientConsentSettings();
  const [moreOpen, setMoreOpen] = useState(false);

  const isItemActive = (href: string) =>
    href === "/portal"
      ? pathname === "/portal"
      : pathname === href || pathname.startsWith(`${href}/`);

  const consentUpdatedOn = consentSettings?.whatsappConsentAt
    ? formatDate(consentSettings.whatsappConsentAt, "dd MMM yyyy")
    : null;

  const secondaryActive = secondaryMobileNav.some((item) =>
    isItemActive(item.href),
  );

  return (
    <nav className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="ui-page-shell px-4">
        <div className="flex h-14 items-center justify-between gap-2 md:h-16">
          <Link
            href="/portal"
            className="shrink-0 text-lg font-bold text-primary md:text-xl"
          >
            Patient Portal
          </Link>
          <div className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={isItemActive(item.href)}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <div className="hidden text-right md:block">
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
            <p className="max-w-[8rem] truncate text-sm text-muted-foreground md:hidden">
              {user?.name}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="touch-manipulation"
              onClick={() => logout()}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {consentUpdatedOn ? (
          <p className="pb-2 text-xs text-muted-foreground md:hidden">
            Consent updated {consentUpdatedOn}
            {" · "}
            <Link
              href="/portal/profile/consent-form"
              className="text-primary underline-offset-2 hover:underline"
            >
              View
            </Link>
          </p>
        ) : null}

        <div className="flex items-center gap-2 pb-3 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
            {primaryMobileNav.map((item) => (
              <NavLink
                key={`mobile-primary-${item.name}`}
                item={item}
                isActive={isItemActive(item.href)}
                compact
              />
            ))}
          </div>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant={secondaryActive ? "default" : "outline"}
                size="sm"
                className="shrink-0 touch-manipulation"
                aria-label="More portal sections"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70dvh]">
              <SheetHeader>
                <SheetTitle>More sections</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {secondaryMobileNav.map((item) => (
                  <NavLink
                    key={`mobile-secondary-${item.name}`}
                    item={item}
                    isActive={isItemActive(item.href)}
                    onNavigate={() => setMoreOpen(false)}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
