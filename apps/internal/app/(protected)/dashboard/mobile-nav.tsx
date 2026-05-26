"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open navigation</TooltipContent>
      </Tooltip>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b border-border/70 px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <DocitaIcon />
            Docita Internal
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col py-4">
          <InternalNavLinks
            items={INTERNAL_SIDEBAR_ITEMS}
            onNavigate={() => setOpen(false)}
            className="flex-1 overflow-y-auto px-2"
          />
          <div className="mt-auto space-y-3 border-t border-border/70 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Theme
              </span>
              <ThemeToggle />
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
