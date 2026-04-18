"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@workspace/ui/components/breadcrumbs";
import { TopBar } from "@workspace/ui/components/top-bar";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import { Search } from "lucide-react";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname);

  const openPalette = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("docita:open-command-palette"));
  };

  return (
    <TopBar
      className="hidden md:flex"
      leading={
        <Breadcrumbs
          items={crumbs}
          renderLink={(item, content) =>
            item.href ? <Link href={item.href}>{content}</Link> : content
          }
        />
      }
      trailing={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openPalette}
            aria-label="Open command palette"
          >
            <Search className="size-4" aria-hidden />
            <span className="text-[var(--fs-xs)] text-muted-foreground">
              Search or jump to
            </span>
            <Kbd>⌘K</Kbd>
          </Button>
          <ThemeToggle />
        </>
      }
    />
  );
}
