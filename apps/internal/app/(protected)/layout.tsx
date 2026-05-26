"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { MobileNav } from "./dashboard/mobile-nav";
import { useAuth } from "@/lib/auth/auth";
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
    title: "Enterprise Contracts",
    href: "/enterprise-contracts",
    icon: FileText,
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
    title: "WhatsApp Broadcasts",
    href: "/broadcasts",
    icon: Megaphone,
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
  return (
    <InternalProtectedGate>
    <AppShell
      className="h-[100dvh] overflow-hidden"
      sidebar={<InternalSidebar />}
      topBar={
        <div className="flex h-14 items-center gap-4 px-4 md:hidden">
          <MobileNav />
          <span className="flex-1 text-lg font-semibold tracking-tight">
            Docita Internal
          </span>
          <ThemeToggle />
        </div>
      }
      mainClassName="overflow-y-auto"
    >
      {children}
    </AppShell>
    </InternalProtectedGate>
  );
}
