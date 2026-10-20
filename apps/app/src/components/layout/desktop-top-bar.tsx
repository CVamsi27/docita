import { useLocation, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Breadcrumbs, type BreadcrumbItem } from "@workspace/ui/components/navigation/breadcrumbs";
import { TopBar } from "@workspace/ui/components/layout/top-bar";
import { breadcrumbsFor } from "@/lib/routing/route-meta";
import { TopBarActions } from "@/components/layout/top-bar-actions";

export function DesktopTopBar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useTranslation("Routes");
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname).map((c) => ({
    ...c,
    label: c.labelKey ? t(c.labelKey) || c.label : c.label,
  }));

  return (
    <div className="hidden lg:block">
      <TopBar
        leading={
          <Breadcrumbs
            items={crumbs}
            renderLink={(item, content) =>
              item.href ? <Link to={item.href}>{content}</Link> : content
            }
          />
        }
        trailing={<TopBarActions />}
      />
    </div>
  );
}
