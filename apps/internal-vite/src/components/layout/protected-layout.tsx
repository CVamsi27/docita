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
  FileSpreadsheet,
  UserCog,
  MessageSquare,
  ScrollText,
  TrendingUp,
  Monitor,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@workspace/ui/components";

const navItems = [
  { section: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Analytics", icon: BarChart3, href: "/analytics" },
    { label: "Performance", icon: TrendingUp, href: "/performance" },
  ]},
  { section: "Management", items: [
    { label: "Users", icon: Users, href: "/users" },
    { label: "Doctors", icon: Stethoscope, href: "/doctors" },
    { label: "Admins", icon: UserCog, href: "/admins" },
  ]},
  { section: "Finance", items: [
    { label: "Billing", icon: CreditCard, href: "/billing" },
    { label: "Pricing", icon: DollarSign, href: "/pricing" },
    { label: "Payment Processing", icon: Wallet, href: "/payment-processing" },
  ]},
  { section: "Operations", items: [
    { label: "Audits", icon: ShieldAlert, href: "/audits" },
    { label: "Logs", icon: ScrollText, href: "/logs" },
    { label: "Broadcasts", icon: Megaphone, href: "/broadcasts" },
    { label: "Support", icon: LifeBuoy, href: "/support" },
    { label: "Feedback", icon: MessageSquare, href: "/feedback" },
  ]},
  { section: "Partners", items: [
    { label: "Referrals", icon: ArrowLeftRight, href: "/referrals" },
    { label: "Enterprise Contracts", icon: FileSpreadsheet, href: "/enterprise-contracts" },
    { label: "System Monitoring", icon: Monitor, href: "/system-monitoring" },
  ]},
];

export function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r bg-background transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>
        <div className="flex items-center justify-between border-b px-3 h-14">
          {!collapsed && <span className="font-semibold text-sm">Docita Admin</span>}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => { setCollapsed(!collapsed); }}
            className="h-8 w-8 cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {navItems.map((group) => (
            <div key={group.section}>
              {!collapsed && <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.section}</p>}
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                  return (
                    <Button
                      key={item.href}
                      type="button"
                      variant="ghost"
                      onClick={() => { void navigate(item.href); }}
                      className={`h-8 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-normal cursor-pointer ${
                        active
                          ? "bg-primary/10 text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void logout();
            }}
            className="h-8 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
