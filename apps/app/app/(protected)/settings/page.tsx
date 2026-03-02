"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentSuccessModal } from "@/features/subscription/components";
import { useSettingsLogic } from "@/features/settings/hooks/use-settings-logic";
import { SettingsPageUI } from "@/features/settings/components/SettingsPageUI";

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

  return (
    <>
      <SettingsPageUI
        filteredTabs={state.filteredTabs}
        searchQuery={state.searchQuery}
        setSearchQuery={handlers.setSearchQuery}
        defaultTab={state.defaultTab}
        firstMatchingTab={state.firstMatchingTab}
      />
      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        planName="Subscription"
      />
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">Loading settings...</div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
