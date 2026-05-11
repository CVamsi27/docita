"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { DocitaIcon } from "@workspace/ui/components/docita-logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
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
import { useAuth } from "@/lib/auth";

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
  const pathname = usePathname();
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
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open navigation</TooltipContent>
      </Tooltip>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DocitaIcon />
            Docita Internal
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full py-6">
          <nav className="grid gap-1 flex-1">
            {sidebarItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
