"use client";

import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { Bell, CalendarClock, Stethoscope, UserPlus, type LucideIcon } from "lucide-react";
import { AppPageScaffold, DataState, PageHeader, PageTabs, type PageTabItem } from "@workspace/ui/components";
import { APP_ACCESS_TARGETS, type AppAccessTarget, type Feature, Tier, type UserRole } from "@workspace/types";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { parseUserRole } from "@/lib/access-control/parse-user-role";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { NotificationsInboxView } from "./NotificationsInboxView";

type InboxTabDef = {
  value: string;
  labelKey: string;
  descriptionKey: string;
  href?: string;
  renderInline?: () => ReactNode;
  icon: LucideIcon;
  accessTarget?: AppAccessTarget;
  feature?: Feature;
  requiredPermission?: Permission;
};

function useInboxTabs(): InboxTabDef[] {
  const { t } = useTranslation("Inbox");
  return [
    {
      value: "notifications",
      labelKey: t("tabs.notifications"),
      descriptionKey: t("tabs.notificationsDescription"),
      renderInline: () => <NotificationsInboxView />,
      icon: Bell,
      accessTarget: APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
    },
    {
      value: "follow-ups",
      labelKey: t("tabs.followUps"),
      descriptionKey: t("tabs.followUpsDescription"),
      href: "/follow-ups",
      icon: CalendarClock,
      accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
    },
    {
      value: "join-requests",
      labelKey: t("tabs.joinRequests"),
      descriptionKey: t("tabs.joinRequestsDescription"),
      href: "/settings/team/join-requests",
      icon: UserPlus,
      requiredPermission: "manageStaff",
    },
    {
      value: "coding-queue",
      labelKey: t("tabs.codingQueue"),
      descriptionKey: t("tabs.codingQueueDescription"),
      href: "/coding-queue",
      icon: Stethoscope,
      accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    },
  ];
}

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
  const { t } = useTranslation("Inbox");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((s) => s.canAccess);
  const currentTier = usePermissionStore((s) => s.currentTier);
  const hasIntelligence = usePermissionStore((s) => s.hasIntelligence);
  const allInboxTabs = useInboxTabs();
  const visibleTabs = useMemo(
    () =>
      allInboxTabs.filter((tab) =>
        isInboxTabVisible(
          tab,
          user?.role ? parseUserRole(user.role) : undefined,
          canAccessFeature,
          currentTier,
          hasIntelligence,
        ),
      ),
    [allInboxTabs, user?.role, canAccessFeature, currentTier, hasIntelligence],
  );

  const defaultTab = visibleTabs[0]?.value ?? "notifications";
  const currentTab = searchParams.get("tab") ?? defaultTab;
  const activeTab =
    visibleTabs.find((tab) => tab.value === currentTab) ?? visibleTabs[0];

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    const requested = searchParams.get("tab");
    const allowedIds = new Set(visibleTabs.map((tab) => tab.value));
    if (requested && !allowedIds.has(requested)) {
      const params = new URLSearchParams(searchParams.toString());
      const defaultTab = visibleTabs[0]?.value;
      if (defaultTab) params.set("tab", defaultTab);
      navigate(`/inbox?${params.toString()}`);
    }
  }, [currentTab, navigate, searchParams, visibleTabs]);

  const tabs: PageTabItem[] = useMemo(
    () =>
      visibleTabs.map((tab) => ({
        id: tab.value,
        label: tab.labelKey,
      })),
    [visibleTabs],
  );

  const pageDescription = useMemo(() => {
    if (visibleTabs.length === 0) return t("pageDescriptionDefault");
    return activeTab?.descriptionKey ?? "";
  }, [visibleTabs, activeTab, t]);

  if (!activeTab || visibleTabs.length === 0) {
    return (
      <AppPageScaffold
        header={<PageHeader title={t("pageTitle")} description={pageDescription} />}
      >
        <DataState
          status="empty"
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
          className="min-h-[40vh]"
        />
      </AppPageScaffold>
    );
  }

  const ActiveIcon = activeTab.icon;

  return (
    <AppPageScaffold
      header={<PageHeader title={t("pageTitle")} description={pageDescription} />}
    >
      <PageTabs
        items={tabs}
        activeId={activeTab.value}
        onSelect={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", next);
          navigate(`/inbox?${params.toString()}`);
        }}
      />

      {activeTab.renderInline ? (
        <div className="mt-4">{activeTab.renderInline()}</div>
      ) : (
        <DataState
          status="empty"
          emptyIcon={ActiveIcon}
          emptyTitle={t("tabEmptyTitle", { label: activeTab.labelKey })}
          emptyDescription={activeTab.descriptionKey}
          emptyAction={
            activeTab.href
              ? {
                  label: t("openWorkspace", { label: activeTab.labelKey.toLowerCase() }),
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
  const { t } = useTranslation("Inbox");
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage={t("loading")}
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
