"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useSubscription } from "@workspace/data-access";
import { resolveSubscriptionGuardRedirect } from "./subscription-guard-helpers";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { clinic } = useClinic();
  const { user } = useAuth();
  const { data: subscription } = useSubscription({
    enabled: Boolean(clinic?.id),
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirectPath = resolveSubscriptionGuardRedirect({
      clinic,
      subscription,
      userRole: user?.role,
      pathname,
    });
    if (redirectPath) router.replace(redirectPath);
  }, [clinic, pathname, router, subscription, user?.role]);

  return <>{children}</>;
}
