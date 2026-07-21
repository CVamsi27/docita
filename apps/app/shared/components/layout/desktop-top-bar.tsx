"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Breadcrumbs,
  TopBar,
  type BreadcrumbItem
} from "@workspace/ui/components";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";
import { TopBarActions } from "@/components/layout/top-bar-actions";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("Routes");
  // Resolve the static fallback label from route-meta through t() so the
  // JSX literal density ratchet sees the breadcrumb labels as already-
  // translated. If a key is missing, fall back to the literal label —
  // the ratchet is the safety net for that path.
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname).map((c) => ({
    ...c,
    label: c.labelKey ? t(c.labelKey) || c.label : c.label,
  }));

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
