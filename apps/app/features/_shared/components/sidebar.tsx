"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Package,
  Receipt,
  Settings,
  Stethoscope,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { useSubscription } from "@/hooks/api/use-settings";

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/patients", icon: Users, label: "Patients" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/queue", icon: ClipboardList, label: "Queue" },
  { href: "/consultation", icon: Stethoscope, label: "Consultation" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({
  isCollapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: subscription } = useSubscription();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-background border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <Link href="/dashboard" className="font-bold text-xl text-primary">
            Docita
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
        {navItems.map((item) => {
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
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

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
    </aside>
  );
}
