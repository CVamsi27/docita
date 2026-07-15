"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@workspace/ui/components/navigation/breadcrumbs";
import { TopBar } from "@workspace/ui/components/layout/top-bar";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";
import { TopBarActions } from "@/components/layout/top-bar-actions";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname);

  return (
    <div className="hidden md:block">
      <TopBar
        leading={
          <Breadcrumbs
            items={crumbs}
            renderLink={(item, content) =>
              item.href ? <Link href={item.href}>{content}</Link> : content
            }
          />
        }
        trailing={<TopBarActions />}
      />
    </div>
  );
}
