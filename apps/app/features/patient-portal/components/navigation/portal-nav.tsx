"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Calendar, FileText, LogOut, Receipt, User } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@workspace/auth";

const navigation = [
  { name: "Dashboard", href: "/portal", icon: User },
  { name: "Appointments", href: "/portal/appointments", icon: Calendar },
  { name: "Prescriptions", href: "/portal/prescriptions", icon: FileText },
  { name: "Billing", href: "/portal/billing", icon: Receipt },
  { name: "Profile", href: "/portal/profile", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/portal" className="text-xl font-bold text-primary">
              Patient Portal
            </Link>
            <div className="hidden md:flex md:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
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
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
