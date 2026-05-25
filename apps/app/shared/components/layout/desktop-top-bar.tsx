"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@workspace/ui/components/navigation/breadcrumbs";
import { TopBar } from "@workspace/ui/components/layout/top-bar";
import { Button } from "@workspace/ui/components/form/button";
import { Sparkles } from "lucide-react";
import { GlobalSearch } from "@/features/search";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { QuickAddPopover } from "@/components/navigation/quick-add-popover";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname);
  const { openOverlay } = useAskAi();

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
          <GlobalSearch />
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
        </>
      }
    />
  );
}
