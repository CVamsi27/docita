import { useAuth } from "@/lib/auth-context";
import { DashboardHeaderUI } from "./dashboard-header-ui";

export function DashboardHeaderContainer() {
  const { user } = useAuth();

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

  return (
    <DashboardHeaderUI
      userName={user?.name || "Doctor"}
      greeting={getGreeting()}
      onSearchClick={handleSearchClick}
    />
  );
}
