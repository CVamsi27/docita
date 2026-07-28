"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PartnerAuthScreen } from "@/features/referral-partner/components/PartnerAuthScreen";
import { partnerSession } from "@/features/referral-partner/lib/partner-session";

export default function PartnerLoginPage() {
  const router = useRouter();
  useEffect(() => {
    if (partnerSession.getAccessToken()) {
      router.replace("/partner/dashboard");
    }
  }, [router]);
  return <PartnerAuthScreen />;
}
