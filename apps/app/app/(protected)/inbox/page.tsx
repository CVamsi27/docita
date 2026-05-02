"use client";

import { Suspense, useMemo } from "react";
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

const TABS: Array<{
  value: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    value: "messages",
    label: "Messages",
    description: "WhatsApp conversations and broadcasts.",
    href: "/whatsapp",
    icon: MessageSquare,
  },
  {
    value: "follow-ups",
    label: "Follow-ups",
    description: "Patients to contact based on visit history.",
    href: "/follow-ups",
    icon: CalendarClock,
  },
  {
    value: "join-requests",
    label: "Join requests",
    description: "Pending team invitations awaiting approval.",
    href: "/settings/team/join-requests",
    icon: UserPlus,
  },
  {
    value: "coding-queue",
    label: "Coding queue",
    description: "Visits awaiting medical coding sign-off.",
    href: "/coding-queue",
    icon: Stethoscope,
  },
];

function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") ?? TABS[0]!.value;
  const tabs: PageTabItem[] = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab.value,
        label: tab.label,
      })),
    [],
  );

  const activeTab = TABS.find((t) => t.value === currentTab) ?? TABS[0]!;
  const ActiveIcon = activeTab.icon;

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Inbox"
          description="WhatsApp threads, follow-ups, join-requests, and coding-queue items in one place."
        />
      }
    >
      <PageTabs
        items={tabs}
        activeId={currentTab}
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
