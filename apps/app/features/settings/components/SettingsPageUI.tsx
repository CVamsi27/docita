import { Search, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import { SmartBackButton } from "@/features/_shared/components/navigation/smart-back-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { RoleGuard } from "@/features/_shared/components";
import {
  AppearanceSettings,
  ClinicGeneralSettings,
  NotificationSettings,
  ReminderSettings,
  SecuritySettings,
  WhatsAppAutomationSettings,
} from ".";
import {
  PrescriptionDefaultsSettingsContainer,
  QueueSettings,
} from "@/features/settings/components";
import { SettingsProfileHeader } from "./profile/SettingsProfileHeader";

interface SettingsTabItem {
  value: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface SettingsCategory {
  category: string;
  items: SettingsTabItem[];
}

interface SettingsPageUIProps {
  filteredTabs: SettingsCategory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  defaultTab: string;
  firstMatchingTab?: string;
}

const lazyPanelFallback = (
  <div className="h-24 rounded-md bg-muted/30 animate-pulse" />
);

const SubscriptionSettingsLazy = dynamic(
  () =>
    import("./billing/SubscriptionSettings").then(
      (mod) => mod.SubscriptionSettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

const MemberManagementSettingsLazy = dynamic(
  () =>
    import("./management/MemberManagementSettings").then(
      (mod) => mod.MemberManagementSettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

const DoctorAvailabilitySettingsLazy = dynamic(
  () =>
    import("./management/DoctorAvailabilitySettings").then(
      (mod) => mod.DoctorAvailabilitySettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

const LeaveManagementSettingsLazy = dynamic(
  () =>
    import("./leave/LeaveManagementSettings").then(
      (mod) => mod.LeaveManagementSettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

const DoctorProfileSettingsLazy = dynamic(
  () =>
    import("./doctor-profile/DoctorProfileSettings").then(
      (mod) => mod.DoctorProfileSettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

const DangerZoneSettingsLazy = dynamic(
  () =>
    import("./danger-zone/DangerZoneSettings").then(
      (mod) => mod.DangerZoneSettings,
    ),
  {
    ssr: false,
    loading: () => lazyPanelFallback,
  },
);

export function SettingsPageUI({
  filteredTabs,
  searchQuery,
  setSearchQuery,
  defaultTab,
  firstMatchingTab,
}: SettingsPageUIProps) {
  const visibleTabValues = new Set(
    filteredTabs.flatMap((category) => category.items.map((item) => item.value)),
  );

  return (
    <div className="container mx-auto space-y-6 pb-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SmartBackButton fallback="/dashboard" label="Back to Dashboard" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your clinic preferences and configurations
              </p>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <SettingsProfileHeader />

      <Tabs
        defaultValue={defaultTab}
        value={searchQuery && firstMatchingTab ? firstMatchingTab : undefined}
        className="flex flex-col md:flex-row gap-6 lg:gap-10"
      >
        <aside className="md:w-56 lg:w-64 shrink-0 flex flex-col">
          <TabsList className="flex flex-row overflow-x-auto md:flex-col w-full h-auto bg-transparent p-0 gap-0.5 md:items-stretch flex-1 pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredTabs.map((category) => {
              const isDangerCategory = category.category === "Danger Zone";
              return (
                <div key={category.category}>
                  <div
                    className={cn(
                      "hidden md:block px-2 py-1.5 text-xs font-semibold uppercase tracking-wider mb-1 mt-3 first:mt-0",
                      isDangerCategory
                        ? "text-destructive/60"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {category.category}
                  </div>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isDangerItem = isDangerCategory;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className={cn(
                          "shrink-0 md:shrink md:w-full justify-start px-3 py-2.5 gap-2 md:gap-3",
                          "data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
                          "rounded-lg whitespace-nowrap",
                          isDangerItem
                            ? "hover:bg-destructive/5 hover:text-destructive transition-colors"
                            : "hover:bg-muted/50 transition-colors",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isDangerItem && "text-destructive/70",
                          )}
                        />
                        <div className="flex flex-col items-start text-left">
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          <span className="hidden md:block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </div>
              );
            })}
          </TabsList>
        </aside>

        <div className="flex-1 min-w-0">
          {visibleTabValues.has("general") && (
            <TabsContent value="general" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageClinic">
                <ClinicGeneralSettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("subscription") && (
            <TabsContent value="subscription" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageBilling">
                <SubscriptionSettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("members") && (
            <TabsContent value="members" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageStaff">
                <MemberManagementSettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("availability") && (
            <TabsContent value="availability" className="mt-0 space-y-6">
              <RoleGuard requiredRole="DOCTOR">
                <DoctorAvailabilitySettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("queue") && (
            <TabsContent value="queue" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageClinic">
                <QueueSettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("prescriptions") && (
            <TabsContent value="prescriptions" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="createPrescription">
                <PrescriptionDefaultsSettingsContainer />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("reminders") && (
            <TabsContent value="reminders" className="mt-0">
              <RoleGuard requiredPermission="manageClinic">
                <ReminderSettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("whatsapp") && (
            <TabsContent value="whatsapp" className="mt-0">
              <RoleGuard requiredPermission="manageClinic">
                <WhatsAppAutomationSettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("notifications") && (
            <TabsContent value="notifications" className="mt-0">
              <RoleGuard requiredPermission="manageClinic">
                <NotificationSettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("security") && (
            <TabsContent value="security" className="mt-0">
              <RoleGuard requiredPermission="manageClinic">
                <SecuritySettings />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("appearance") && (
            <TabsContent value="appearance" className="mt-0">
              <AppearanceSettings />
            </TabsContent>
          )}

          {visibleTabValues.has("leave") && (
            <TabsContent value="leave" className="mt-0 space-y-6">
              <RoleGuard requiredRole="DOCTOR">
                <LeaveManagementSettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("doctor-profile") && (
            <TabsContent value="doctor-profile" className="mt-0 space-y-6">
              <RoleGuard requiredRole="DOCTOR">
                <DoctorProfileSettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("danger-zone") && (
            <TabsContent value="danger-zone" className="mt-0 space-y-6">
              <DangerZoneSettingsLazy />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
