"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AppPageScaffold,
  DataState
} from "@workspace/ui/components";
import { PaymentSuccessModal } from "@/features/subscription/components";
import { useSettingsLogic } from "@/features/settings/hooks/use-settings-logic";
import { SettingsPageUI } from "@/features/settings/components/SettingsPageUI";

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  "join-requests": "/settings/team/join-requests",
  compliance: "/settings/compliance",
  // WhatsApp sender config lives on its standalone route (canonical; linked
  // from Enterprise Branding and the WhatsApp Ops page). The old in-settings
  // tab redirects here (M6 dedupe).
  "whatsapp-sender": "/settings/whatsapp-sender",
};

function SettingsContent() {
  const { state, handlers } = useSettingsLogic();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (searchParams?.get("payment") === "success") {
      setShowSuccessModal(true);

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("payment");
      router.replace(`/settings?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const requestedTab = searchParams?.get("tab");
    if (requestedTab && LEGACY_TAB_REDIRECTS[requestedTab]) {
      router.replace(LEGACY_TAB_REDIRECTS[requestedTab]);
    }
  }, [searchParams, router]);

  return (
    <>
      <SettingsPageUI
        filteredTabs={state.filteredTabs}
        searchQuery={state.searchQuery}
        setSearchQuery={handlers.setSearchQuery}
        tabValue={state.tabValue}
        onTabChange={handlers.onTabChange}
      />
      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        planName="Subscription"
      />
    </>
  );
}

export function SettingsPageClient() {
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage="Loading settings…"
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
