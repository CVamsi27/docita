"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import {
  PageTabs,
  type PageTabItem,
} from "@workspace/ui/components/navigation/page-tabs";
import { WhatsappTemplatesSettings } from "@/features/settings";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin } from "@/lib/auth/permissions";
import { WhatsappCampaignsView } from "./WhatsappCampaignsView";
import { WhatsappConversationsView } from "./WhatsappConversationsView";
import { WhatsappDeliveryView } from "./WhatsappDeliveryView";

const TABS: PageTabItem[] = [
  { id: "conversations", label: "Conversations" },
  { id: "campaigns", label: "Campaigns" },
  { id: "templates", label: "Templates" },
  { id: "delivery", label: "Delivery" },
];

function WhatsappOperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const activeTab = useMemo(() => {
    const requested = searchParams?.get("tab");
    return TABS.some((tab) => tab.id === requested)
      ? (requested ?? "conversations")
      : "conversations";
  }, [searchParams]);
  const canManageSender = isAdmin(user?.role);

  return (
    <AppPageScaffold
      contentClassName="space-y-5"
      header={
        <PageHeader
          title="WhatsApp"
          description="Patient conversations, approved outreach, templates, and delivery health."
          actions={
            canManageSender ? (
              <Button variant="outline" asChild>
                <Link href="/settings/whatsapp-sender">
                  <Settings2 className="size-4" />
                  Sender settings
                </Link>
              </Button>
            ) : undefined
          }
        />
      }
    >
      <PageTabs
        items={TABS}
        activeId={activeTab}
        onSelect={(tab) => router.replace(`/whatsapp?tab=${tab}`)}
      />
      {activeTab === "conversations" ? <WhatsappConversationsView /> : null}
      {activeTab === "campaigns" ? <WhatsappCampaignsView /> : null}
      {activeTab === "templates" ? <WhatsappTemplatesSettings /> : null}
      {activeTab === "delivery" ? <WhatsappDeliveryView /> : null}
    </AppPageScaffold>
  );
}

export function WhatsappOperationsPageContent() {
  return (
    <Suspense>
      <WhatsappOperationsContent />
    </Suspense>
  );
}
