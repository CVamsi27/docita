"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  FileText,
  Home,
  Menu,
  Package,
  Receipt,
  Settings,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useUnreadNotificationCount } from "@/hooks/api/use-whatsapp";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/patients", icon: Users, label: "Patients" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/consultation", icon: Stethoscope, label: "Today's Queue" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/documents", icon: FileText, label: "Documents" },
  {
    href: "/settings?tab=notification-feed",
    icon: Bell,
    label: "Notifications",
  },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const notificationCount = unreadNotificationCount?.count ?? 0;

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                <DocitaLogo />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => {
                const isActive =
                  (item.href.startsWith("/settings?") &&
                    pathname === "/settings") ||
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.href.startsWith("/settings?tab=notification-feed") &&
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
          </div>
        </>
      )}
    </div>
  );
}
