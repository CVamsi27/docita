"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Menu, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

import { sidebarItems } from "@/lib/constants";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { canAccess } = usePermissionStore();
  const [open, setOpen] = useState(false);

  // Filter items by role and feature access (same as sidebar)
  const filteredItems = sidebarItems.filter(
    (item) =>
      user &&
      item.roles.includes(user.role) &&
      (item.feature ? canAccess(item.feature) : true),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar border-r border-sidebar-border"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <div className="flex items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="ml-3 text-lg font-bold tracking-tight text-sidebar-foreground">
                Docita
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="grid gap-2 px-3">
              {filteredItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200",
                        !isActive && "group-hover:scale-110",
                      )}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
                <span className="text-sm font-bold">
                  {user?.name?.charAt(0) || "D"}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name || "Doctor"}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/70">
                  {user?.email || "admin@docita.com"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
