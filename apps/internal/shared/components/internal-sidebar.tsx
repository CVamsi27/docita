"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import { INTERNAL_SIDEBAR_ITEMS } from "@/lib/internal-nav";
import { InternalNavLinks } from "@/components/internal-nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { useAuth } from "@/lib/auth/auth";

export function InternalSidebar() {
  const { logout } = useAuth();

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/70 bg-background/70 backdrop-blur">
      <div className="flex h-14 shrink-0 items-center border-b border-border/70 px-6">
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <DocitaIcon />
          <span>Docita Internal</span>
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <InternalNavLinks items={INTERNAL_SIDEBAR_ITEMS} className="px-2" />
      </div>
      <div className="shrink-0 space-y-3 border-t border-border/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Theme
          </span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Language
          </span>
          <LocaleSwitcher />
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
