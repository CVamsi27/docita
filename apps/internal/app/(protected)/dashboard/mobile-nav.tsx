"use client";

import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@workspace/ui/components";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import { INTERNAL_SIDEBAR_ITEMS } from "@/lib/internal-nav";
import { InternalNavLinks } from "@/components/internal-nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth/auth";

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
