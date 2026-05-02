"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@workspace/ui/components/breadcrumbs";
import { TopBar } from "@workspace/ui/components/top-bar";
import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import { Bell, Search, Sparkles } from "lucide-react";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";
import { QuickAddPopover } from "@/features/_shared/components/navigation/quick-add-popover";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname);
  const { openOverlay } = useAskAi();

  const openPalette = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("docita:open-command-palette"));
  };

  return (
    <TopBar
      leading={
        <div className="hidden md:block">
          <Breadcrumbs
            items={crumbs}
            renderLink={(item, content) =>
              item.href ? <Link href={item.href}>{content}</Link> : content
            }
          />
        </div>
      }
      trailing={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-2 md:inline-flex"
            onClick={openPalette}
            aria-label="Open command palette"
          >
            <Search className="size-4" aria-hidden />
            <span className="text-[var(--fs-xs)] text-muted-foreground">
              Search or jump to
            </span>
            <Kbd>⌘K</Kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={openPalette}
            aria-label="Search or jump to"
          >
            <Search className="size-4" aria-hidden />
          </Button>
          <QuickAddPopover />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => openOverlay()}
            aria-label="Open Ask AI"
            data-testid="topbar-ask-ai"
          >
            <Sparkles className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            asChild
            aria-label="Notifications"
          >
            <Link href="/inbox">
              <Bell className="size-4" aria-hidden />
            </Link>
          </Button>
        </>
      }
    />
  );
}
