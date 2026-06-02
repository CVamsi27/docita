"use client";

import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Stethoscope,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import {
  PageTabs,
  type PageTabItem,
} from "@workspace/ui/components/navigation/page-tabs";
import {
  APP_ACCESS_TARGETS,
  type AppAccessTarget,
  type Feature,
  Tier,
  type UserRole,
} from "@workspace/types";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { parseUserRole } from "@/lib/access-control/parse-user-role";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { NotificationsInboxView } from "./NotificationsInboxView";

type InboxTabDef = {
  value: string;
  label: string;
  description: string;
  href?: string;
  renderInline?: () => ReactNode;
  icon: LucideIcon;
  accessTarget?: AppAccessTarget;
  feature?: Feature;
  requiredPermission?: Permission;
};

const ALL_INBOX_TABS: InboxTabDef[] = [
  {
    value: "notifications",
    label: "Notifications",
    description: "Alerts and activity across your clinic.",
    renderInline: () => <NotificationsInboxView />,
    icon: Bell,
    accessTarget: APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
  },
  {
    value: "follow-ups",
    label: "Follow-ups",
    description: "Patients to contact based on visit history.",
    href: "/follow-ups",
    icon: CalendarClock,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  {
    value: "join-requests",
    label: "Join requests",
    description: "Pending team invitations awaiting approval.",
    href: "/settings/team/join-requests",
    icon: UserPlus,
    requiredPermission: "manageStaff",
  },
  {
    value: "coding-queue",
    label: "Coding queue",
    description: "Visits awaiting medical coding sign-off.",
    href: "/coding-queue",
    icon: Stethoscope,
    accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
  },
];

function isInboxTabVisible(
  tab: InboxTabDef,
  role: UserRole | undefined,
  canAccessFeature: (feature: Feature) => boolean,
  currentTier: Tier,
  hasIntelligence: boolean,
): boolean {
  if (tab.requiredPermission) {
    if (!role || !hasPermission(role, tab.requiredPermission)) {
      return false;
    }
  }
  if (tab.feature && !canAccessFeature(tab.feature)) {
    return false;
  }
  if (tab.accessTarget) {
    return canAccessTarget(
      tab.accessTarget,
      {
        role,
        canAccessFeature,
        currentTier,
        hasIntelligence,
      },
      "read",
    );
  }
  return true;
}

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((s) => s.canAccess);
  const currentTier = usePermissionStore((s) => s.currentTier);
  const hasIntelligence = usePermissionStore((s) => s.hasIntelligence);
  const visibleTabs = useMemo(
    () =>
      ALL_INBOX_TABS.filter((tab) =>
        isInboxTabVisible(
          tab,
          user?.role ? parseUserRole(user.role) : undefined,
          canAccessFeature,
          currentTier,
          hasIntelligence,
        ),
      ),
    [user?.role, canAccessFeature, currentTier, hasIntelligence],
  );

  const defaultTab = visibleTabs[0]?.value ?? "notifications";
  const currentTab = searchParams?.get("tab") ?? defaultTab;
  const activeTab =
    visibleTabs.find((t) => t.value === currentTab) ?? visibleTabs[0];

  useEffect(() => {
    if (!searchParams || visibleTabs.length === 0) return;
    const requested = searchParams.get("tab");
    const allowedIds = new Set(visibleTabs.map((t) => t.value));
    if (requested && !allowedIds.has(requested)) {
      const params = new URLSearchParams(searchParams.toString());
      const defaultTab = visibleTabs[0]?.value;
      if (defaultTab) params.set("tab", defaultTab);
      router.replace(`/inbox?${params.toString()}`);
    }
  }, [currentTab, router, searchParams, visibleTabs]);

  const tabs: PageTabItem[] = useMemo(
    () =>
      visibleTabs.map((tab) => ({
        id: tab.value,
        label: tab.label,
      })),
    [visibleTabs],
  );

  const pageDescription = useMemo(() => {
    if (visibleTabs.length === 0) {
      return "Notifications and shortcuts to workspaces you can access.";
    }
    return activeTab?.description ?? "";
  }, [visibleTabs, activeTab]);

  if (!activeTab || visibleTabs.length === 0) {
    return (
      <AppPageScaffold
        header={<PageHeader title="Inbox" description={pageDescription} />}
      >
        <DataState
          status="empty"
          emptyTitle="No inbox shortcuts for your role"
          emptyDescription="Your plan or role does not include the workspaces that normally appear here."
          className="min-h-[40vh]"
        />
      </AppPageScaffold>
    );
  }

  const ActiveIcon = activeTab.icon;

  return (
    <AppPageScaffold
      header={<PageHeader title="Inbox" description={pageDescription} />}
    >
      <PageTabs
        items={tabs}
        activeId={activeTab.value}
        onSelect={(next) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.set("tab", next);
          router.replace(`/inbox?${params.toString()}`);
        }}
      />

      {activeTab.renderInline ? (
        <div className="mt-4">{activeTab.renderInline()}</div>
      ) : (
        <DataState
          status="empty"
          emptyIcon={ActiveIcon}
          emptyTitle={`${activeTab.label} live in their dedicated workspace`}
          emptyDescription={activeTab.description}
          emptyAction={
            activeTab.href
              ? {
                  label: `Open ${activeTab.label.toLowerCase()}`,
                  href: activeTab.href,
                }
              : undefined
          }
          className="min-h-[40vh]"
        />
      )}
    </AppPageScaffold>
  );
}

export function InboxPageContent() {
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage="Loading inbox..."
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
