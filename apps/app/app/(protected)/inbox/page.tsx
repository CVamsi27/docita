"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageTabs, type PageTabItem } from "@workspace/ui/components/page-tabs";
import { DataState } from "@workspace/ui/components/data-state";
import {
  CalendarClock,
  MessageSquare,
  Stethoscope,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  APP_ACCESS_TARGETS,
  type AppAccessTarget,
  type Feature,
  type UserRole,
  type WorkspaceProfile,
} from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/permissions";

type InboxTabDef = {
  value: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accessTarget?: AppAccessTarget;
  feature?: Feature;
  requiredPermission?: Permission;
};

const ALL_INBOX_TABS: InboxTabDef[] = [
  {
    value: "messages",
    label: "Messages",
    description: "WhatsApp conversations and broadcasts.",
    href: "/whatsapp",
    icon: MessageSquare,
    accessTarget: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
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
  workspaceProfile: WorkspaceProfile,
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
      { role, canAccessFeature: canAccessFeature, workspaceProfile },
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
  const workspaceProfile = usePermissionStore((s) => s.workspaceProfile);

  const visibleTabs = useMemo(
    () =>
      ALL_INBOX_TABS.filter((tab) =>
        isInboxTabVisible(
          tab,
          user?.role as UserRole | undefined,
          canAccessFeature,
          workspaceProfile,
        ),
      ),
    [user?.role, canAccessFeature, workspaceProfile],
  );

  const defaultTab = visibleTabs[0]?.value ?? "follow-ups";
  const currentTab = searchParams?.get("tab") ?? defaultTab;
  const activeTab =
    visibleTabs.find((t) => t.value === currentTab) ?? visibleTabs[0];

  useEffect(() => {
    if (!searchParams || visibleTabs.length === 0) return;
    const requested = searchParams.get("tab");
    const allowedIds = new Set(visibleTabs.map((t) => t.value));
    if (requested && !allowedIds.has(requested)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", visibleTabs[0]!.value);
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
      return "Shortcuts to workspaces you can access from this clinic.";
    }
    const parts = visibleTabs.map((t) => t.label.toLowerCase());
    if (parts.length === 1) {
      return `Open ${parts[0]} from this hub.`;
    }
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]} in one place.`;
  }, [visibleTabs]);

  if (!activeTab || visibleTabs.length === 0) {
    return (
      <AppPageScaffold
        header={
          <PageHeader
            title="Inbox"
            description={pageDescription}
          />
        }
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
      header={
        <PageHeader title="Inbox" description={pageDescription} />
      }
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

      <DataState
        status="empty"
        emptyIcon={ActiveIcon}
        emptyTitle={`${activeTab.label} live in their dedicated workspace`}
        emptyDescription={activeTab.description}
        emptyAction={{
          label: `Open ${activeTab.label.toLowerCase()}`,
          href: activeTab.href,
        }}
        className="min-h-[40vh]"
      />
    </AppPageScaffold>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage="Loading inbox…"
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
