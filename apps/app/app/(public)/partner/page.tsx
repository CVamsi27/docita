"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { partnerSession } from "@/features/referral-partner/lib/partner-session";

export default function PartnerIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace(
      partnerSession.getAccessToken() ? "/partner/dashboard" : "/partner/login",
    );
  }, [router]);
  return null;
}
