"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { PageTabs, type PageTabItem } from "@workspace/ui/components/navigation/page-tabs";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import {
  ClipboardList,
  FileText,
  MessageCircle,
  Pill,
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
    value: "notes",
    label: "Note templates",
    description: "Reusable consultation note templates and SOAP scaffolds.",
    href: "/settings?tab=prescriptions",
    icon: FileText,
  },
  {
    value: "prescriptions",
    label: "Prescription templates",
    description: "Saved Rx blocks and medicine sets for common conditions.",
    href: "/settings?tab=prescriptions",
    icon: Pill,
  },
  {
    value: "messages",
    label: "Message templates",
    description: "WhatsApp and reminder templates for patient outreach.",
    href: "/settings?tab=whatsapp",
    icon: MessageCircle,
  },
  {
    value: "consent",
    label: "Consent forms",
    description: "DPDP, treatment, and procedure consent forms.",
    href: "/settings/compliance",
    icon: ClipboardList,
  },
];

function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") ?? TABS[0].value;
  const tabs: PageTabItem[] = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab.value,
        label: tab.label,
      })),
    [],
  );

  const activeTab = TABS.find((t) => t.value === currentTab) ?? TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Templates"
          description="Note, prescription, message, and consent templates in one place."
        />
      }
    >
      <PageTabs
        items={tabs}
        activeId={currentTab}
        onSelect={(next) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.set("tab", next);
          router.replace(`/templates?${params.toString()}`);
        }}
      />

      <DataState
        status="empty"
        emptyIcon={ActiveIcon}
        emptyTitle={`${activeTab.label} live in their existing workspace`}
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

export default function TemplatesPage() {
  return (
    <FeatureGate feature={Feature.PRESCRIPTION_TEMPLATES} showLockedCard>
      <Suspense
        fallback={
          <AppPageScaffold>
            <DataState
              status="loading"
              loadingMessage="Loading templates…"
              className="min-h-[40vh]"
            />
          </AppPageScaffold>
        }
      >
        <TemplatesContent />
      </Suspense>
    </FeatureGate>
  );
}
