import { Link, useLocation } from "react-router";
import { Calendar, LayoutGrid, Menu, Stethoscope, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

interface MobileBottomNavProps {
  onMore: () => void;
}

const TABS = [
  { href: "/today", label: "Today", icon: LayoutGrid },
  { href: "/consultation", label: "Queue", icon: Stethoscope },
  { href: "/appointments", label: "Calendar", icon: Calendar },
  { href: "/patients", label: "Patients", icon: Users },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/today"
    ? pathname === "/today"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ onMore }: MobileBottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav aria-label="Primary" className={cn("fixed inset-x-0 bottom-0 z-40 md:hidden", "flex items-stretch justify-around gap-1", "border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85", "px-1 pb-[env(safe-area-inset-bottom,0px)]")}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(pathname, tab.href);
        return (
          <Link key={tab.href} to={tab.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-[length:var(--fs-2xs)] font-medium transition-colors duration-150 touch-manipulation", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <Button
        variant="ghost"
        onClick={onMore}
        aria-label="More navigation"
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-[length:var(--fs-2xs)] font-medium text-muted-foreground touch-manipulation h-auto"
      >
        <Menu className="size-5 shrink-0" aria-hidden />
        <span>More</span>
      </Button>
    </nav>
  );
}
