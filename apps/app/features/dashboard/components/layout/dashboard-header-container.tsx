import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { DashboardHeaderUI } from "./dashboard-header-ui";

interface DashboardHeaderContainerProps {
  summary?: string;
  headerActions?: ReactNode;
}

export function DashboardHeaderContainer({
  summary,
  headerActions,
}: DashboardHeaderContainerProps) {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const canQuickShareClinicCode =
    user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";
  const { data: clinicSettings } = useClinicSettings({
    enabled: canQuickShareClinicCode,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    document.dispatchEvent(event);
  };

  const displayName = (() => {
    const name = user?.name ?? "";
    if (!name || name.includes("@")) return "Doctor";
    return name.split(" ")[0];
  })();

  return (
    <DashboardHeaderUI
      userName={displayName}
      greeting={getGreeting()}
      onSearchClick={handleSearchClick}
      clinicCode={clinicSettings?.referralCode ?? clinic?.referralCode}
      clinicName={clinicSettings?.name ?? clinic?.name}
      canQuickShareClinicCode={canQuickShareClinicCode}
      summary={summary}
      headerActions={headerActions}
    />
  );
}
