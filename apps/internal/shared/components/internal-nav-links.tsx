"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import type { InternalNavItem } from "@/lib/internal-nav";

type InternalNavLinksProps = {
  items: InternalNavItem[];
  onNavigate?: () => void;
  className?: string;
};

export function InternalNavLinks({
  items,
  onNavigate,
  className,
}: InternalNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("grid gap-1", className)}>
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
