"use client";

import { Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, PageHeader, PageTabs, type PageTabItem } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { ClipboardList, FileText, MessageCircle, Pill, type LucideIcon } from "lucide-react";

const TABS: Array<{
  value: string;
  labelKey: string;
  descriptionKey: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    value: "notes",
    labelKey: "tabs.notes.label",
    descriptionKey: "tabs.notes.description",
    href: "/settings?tab=prescriptions",
    icon: FileText,
  },
  {
    value: "prescriptions",
    labelKey: "tabs.prescriptions.label",
    descriptionKey: "tabs.prescriptions.description",
    href: "/settings?tab=prescriptions",
    icon: Pill,
  },
  {
    value: "messages",
    labelKey: "tabs.messages.label",
    descriptionKey: "tabs.messages.description",
    href: "/settings?tab=whatsapp",
    icon: MessageCircle,
  },
  {
    value: "consent",
    labelKey: "tabs.consent.label",
    descriptionKey: "tabs.consent.description",
    href: "/settings/compliance",
    icon: ClipboardList,
  },
];

function TemplatesContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("Templates");
  const currentTab = searchParams?.get("tab") ?? TABS[0].value;
  const tabs: PageTabItem[] = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab.value,
        label: t(tab.labelKey),
      })),
    [t],
  );

  const activeTab = TABS.find((tab) => tab.value === currentTab) ?? TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("page.title")}
          description={t("page.description")}
        />
      }
    >
      <PageTabs
        items={tabs}
        activeId={currentTab}
        onSelect={(next) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.set("tab", next);
          navigate(`/templates?${params.toString()}`);
        }}
      />

      <DataState
        status="empty"
        emptyIcon={ActiveIcon}
        emptyTitle={t("empty.title", { label: t(activeTab.labelKey) })}
        emptyDescription={t(activeTab.descriptionKey)}
        emptyAction={{
          label: t("empty.action", { label: t(activeTab.labelKey) }),
          href: activeTab.href,
        }}
        className="min-h-[40vh]"
      />
    </AppPageScaffold>
  );
}

export function TemplatesPageContent() {
  const { t } = useTranslation("Templates");
  return (
    <PageFeatureGate
      feature={Feature.PRESCRIPTION_TEMPLATES}
      title={t("page.title")}
      description={t("page.description")}
    >
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
        <TemplatesContent />
      </Suspense>
    </PageFeatureGate>
  );
}
