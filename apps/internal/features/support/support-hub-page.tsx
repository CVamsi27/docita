"use client";

import { useState } from "react";
import { AppPageScaffold, PageHeader, PageTabs } from "@workspace/ui/components";
import { SupportInboxPage } from "./support-inbox-page";
import { SupportInquiriesSection } from "./support-inquiries-section";

const SUPPORT_TABS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "inquiries", label: "Contact form" },
] as const;

type SupportTabId = (typeof SUPPORT_TABS)[number]["id"];

function isSupportTabId(id: string): id is SupportTabId {
  return SUPPORT_TABS.some((tab) => tab.id === id);
}

export function SupportHubPage() {
  const [activeTab, setActiveTab] = useState<SupportTabId>("whatsapp");

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Support"
          description="WhatsApp conversations and contact form inquiries from the public site."
        />
      }
    >
      <PageTabs
        items={SUPPORT_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeId={activeTab}
        onSelect={(id) => {
          if (isSupportTabId(id)) {
            setActiveTab(id);
          }
        }}
        ariaLabel="Support channels"
      />

      {activeTab === "whatsapp" ? (
        <SupportInboxPage />
      ) : (
        <SupportInquiriesSection />
      )}
    </AppPageScaffold>
  );
}
