import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/lib/auth/auth";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CreditCard,
  DollarSign,
  BarChart3,
  LifeBuoy,
  Wallet,
  Megaphone,
  ShieldAlert,
  ArrowLeftRight,
  Building2,
  FileSpreadsheet,
  UserCog,
  MessageSquare,
  ScrollText,
  TrendingUp,
  Monitor,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { AppShell } from "@workspace/ui/components/layout/app-shell";
import { TopBar } from "@workspace/ui/components/layout/top-bar";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppTheme } from "@/components/layout/theme-context";

const navItems = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Analytics", icon: BarChart3, href: "/analytics" },
      { label: "Performance", icon: TrendingUp, href: "/performance" },
    ],
  },
  {
    section: "Management",
    items: [
      { label: "Users", icon: Users, href: "/users" },
      { label: "Doctors", icon: Stethoscope, href: "/doctors" },
      { label: "Admins", icon: UserCog, href: "/admins" },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Billing", icon: CreditCard, href: "/billing" },
      { label: "Pricing", icon: DollarSign, href: "/pricing" },
      {
        label: "Payment Processing",
        icon: Wallet,
        href: "/payment-processing",
      },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Audits", icon: ShieldAlert, href: "/audits" },
      { label: "Logs", icon: ScrollText, href: "/logs" },
      { label: "Broadcasts", icon: Megaphone, href: "/broadcasts" },
      { label: "Support", icon: LifeBuoy, href: "/support" },
      { label: "Feedback", icon: MessageSquare, href: "/feedback" },
    ],
  },
  {
    section: "Partners",
    items: [
      { label: "Referrals", icon: ArrowLeftRight, href: "/referrals" },
      { label: "Leads", icon: Building2, href: "/leads" },
      {
        label: "Enterprise Contracts",
        icon: FileSpreadsheet,
        href: "/enterprise-contracts",
      },
      { label: "System Monitoring", icon: Monitor, href: "/system-monitoring" },
    ],
  },
];

function ConsoleNavigation({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const location = useLocation();
  return (
    <nav
      aria-label="Internal navigation"
      className="min-h-0 flex-1 overflow-y-auto p-2 space-y-5"
    >
      {navItems.map((group) => (
        <div key={group.section}>
          {!collapsed ? (
            <p className="px-2 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.section}
            </p>
          ) : null}
          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active =
                location.pathname === item.href ||
                location.pathname.startsWith(item.href + "/");
              return (
                <Button
                  key={item.href}
                  type="button"
                  variant="ghost"
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.href)}
                  className={`h-10 w-full justify-start gap-3 px-2 text-sm ${active ? "bg-muted font-medium text-foreground" : "font-normal text-muted-foreground"}`}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed ? (
                    <span className="truncate">{item.label}</span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ConsoleFooter({ collapsed }: { collapsed: boolean }) {
  const { logout } = useAuth();
  const { resolvedTheme, setTheme } = useAppTheme();
  return (
    <div className="shrink-0 space-y-1 border-t border-border/70 p-2">
      <div className="flex items-center gap-2">
        <ThemeToggle
          resolvedTheme={resolvedTheme}
          onToggle={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
        {!collapsed ? (
          <span className="text-sm text-muted-foreground">Theme</span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label="Sign out"
        onClick={() => {
          void logout();
        }}
        className="h-10 w-full justify-start gap-3 px-2 text-sm text-muted-foreground"
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        {!collapsed ? "Sign out" : null}
      </Button>
    </div>
  );
}

export function ProtectedLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleNavigate = (href: string) => {
    setMobileOpen(false);
    void navigate(href);
  };

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppShell
        className="h-dvh overflow-hidden"
        sidebarWidth={collapsed ? "3.5rem" : "14rem"}
        mainClassName="ui-workspace-ledger min-h-0 overflow-y-auto p-4 md:p-6"
        sidebar={
          <div className="flex h-dvh flex-col border-r border-border/70 bg-background">
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-2">
              {!collapsed ? <DocitaLogo className="h-9 w-auto" /> : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="size-9 shrink-0"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="size-4" aria-hidden />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            <ConsoleNavigation
              collapsed={collapsed}
              onNavigate={handleNavigate}
            />
            <ConsoleFooter collapsed={collapsed} />
          </div>
        }
        topBar={
          <TopBar
            leading={
              <>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation"
                    className="md:hidden"
                  >
                    <Menu className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <span className="text-sm font-medium">Internal console</span>
              </>
            }
            trailing={
              <span className="text-sm text-muted-foreground">Operator</span>
            }
          />
        }
      >
        <div id="main-content" tabIndex={-1}>
          <Outlet />
        </div>
      </AppShell>
      <SheetContent side="left" className="w-80 max-w-[90vw] gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border/70 pr-12">
          <SheetTitle>Internal navigation</SheetTitle>
          <SheetDescription>Navigate the operator console.</SheetDescription>
        </SheetHeader>
        <ConsoleNavigation collapsed={false} onNavigate={handleNavigate} />
        <ConsoleFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}
