"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { DocitaIcon } from "@workspace/ui/components/docita-logo";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { MobileNav } from "./dashboard/mobile-nav";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Team",
    href: "/users",
    icon: Users,
  },
  {
    title: "Admins",
    href: "/admins",
    icon: Shield,
  },
  {
    title: "Payment Processing",
    href: "/payment-processing",
    icon: CreditCard,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Pricing",
    href: "/pricing",
    icon: CreditCard,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "System Monitoring",
    href: "/system-monitoring",
    icon: Activity,
  },
  {
    title: "Feedback",
    href: "/feedback",
    icon: MessageSquare,
  },
  {
    title: "Support WhatsApp",
    href: "/support",
    icon: Inbox,
  },
  {
    title: "System Logs",
    href: "/logs",
    icon: FileText,
  },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {}
      <aside className="hidden w-64 flex-col border-r border-border/70 bg-background/70 backdrop-blur md:flex">
        <div className="flex h-14 items-center border-b border-border/70 px-6">
          <Link
            href="/dashboard"
            className="flex h-10 items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <DocitaIcon />
            <span>Docita Internal</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <nav className="grid gap-1 px-2">
            {sidebarItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-border/70 p-4 space-y-2">
          <ThemeToggle />
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col overflow-hidden">
        {}
        <header className="flex h-14 items-center gap-4 border-b border-border/70 bg-background/80 backdrop-blur px-4 md:hidden">
          <MobileNav />
          <span className="text-lg font-semibold tracking-tight">
            Docita Internal
          </span>
        </header>

        <main className="flex-1 overflow-y-auto" aria-label="Main content">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
