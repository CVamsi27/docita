import { Link, useLocation } from "react-router";
import { SidebarNavItem } from "@workspace/ui/components/navigation/sidebar-nav-item";
import type { NavItem } from "@/components/navigation/nav-config";

export function SidebarLink({
  item,
  collapsedRail,
  showLabels,
}: {
  item: NavItem;
  collapsedRail: boolean;
  showLabels: boolean;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <SidebarNavItem
      label={item.label}
      icon={item.icon}
      isActive={isActive}
      collapsedRail={collapsedRail}
      showLabels={showLabels}
      renderLink={({ className, children, "aria-label": ariaLabel }) => (
        <Link to={item.href} aria-label={ariaLabel} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
