"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppPageScaffold, PageHeader, PageTabs } from "@workspace/ui/components";
import { SupportInboxPage } from "./support-inbox-page";
import { SupportInquiriesSection } from "./support-inquiries-section";

const SUPPORT_TAB_IDS = ["whatsapp", "inquiries"] as const;

type SupportTabId = (typeof SUPPORT_TAB_IDS)[number];

const SUPPORT_TAB_SET = new Set<string>(SUPPORT_TAB_IDS);

function isSupportTabId(id: string): id is SupportTabId {
  return SUPPORT_TAB_SET.has(id);
}

export function SupportHubPage() {
  const t = useTranslations("SupportHub");
  const [activeTab, setActiveTab] = useState<SupportTabId>("whatsapp");
  const tabItems = useMemo(
    () => [
      { id: "whatsapp", label: t("tabWhatsapp") },
      { id: "inquiries", label: t("tabInquiries") },
    ],
    [t],
  );

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
      }
    >
      <PageTabs
        items={tabItems}
        activeId={activeTab}
        onSelect={(id) => {
          if (isSupportTabId(id)) {
            setActiveTab(id);
          }
        }}
        ariaLabel={t("tabAria")}
      />

      {activeTab === "whatsapp" ? (
        <SupportInboxPage />
      ) : (
        <SupportInquiriesSection />
      )}
    </AppPageScaffold>
  );
}
