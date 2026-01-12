"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Calendar,
  Settings,
  Menu,
  X,
  FileText,
  Package,
  Receipt,
  ClipboardList,
  Stethoscope,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";

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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
              <Link
                href="/dashboard"
                className="font-bold text-xl text-primary"
                onClick={() => setIsOpen(false)}
              >
                Docita
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
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
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
