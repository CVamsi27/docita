import dynamic from "next/dynamic";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { BackButton } from "@/components/common/navigation/back-button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
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
} from "@/features/settings/components";
import {
  PrescriptionDefaultsSettingsContainer,
  QueueSettings,
} from "@/features/settings/components";
import { HelpSupportSettingsPanel } from "./help-support/HelpSupportSettingsPanel";
import {
  SettingsPageHeaderUserMeta,
  SettingsProfileHeader,
} from "./profile/SettingsProfileHeader";
import { SettingsExpandedSearch } from "./settings-expanded-search";

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
  tabValue: string;
  onTabChange: (value: string) => void;
}

function LazySettingsPanelFallback() {
  return (
    <div
      className="space-y-4 py-4"
      role="status"
      aria-live="polite"
      aria-label="Loading settings section"
    >
      <div className="flex items-center gap-3">
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

const SubscriptionSettingsLazy = dynamic(
  () =>
    import("./billing/SubscriptionSettings").then(
      (mod) => mod.SubscriptionSettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const MemberManagementSettingsLazy = dynamic(
  () =>
    import("./management/MemberManagementSettings").then(
      (mod) => mod.MemberManagementSettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const DoctorAvailabilitySettingsLazy = dynamic(
  () =>
    import("./management/DoctorAvailabilitySettings").then(
      (mod) => mod.DoctorAvailabilitySettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const DoctorTimeAwaySettingsLazy = dynamic(
  () =>
    import("./management/DoctorTimeAwaySettings").then(
      (mod) => mod.DoctorTimeAwaySettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const LeaveManagementSettingsLazy = dynamic(
  () =>
    import("./leave/LeaveManagementSettings").then(
      (mod) => mod.LeaveManagementSettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const DoctorProfileSettingsLazy = dynamic(
  () =>
    import("./doctor-profile/DoctorProfileSettings").then(
      (mod) => mod.DoctorProfileSettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

const DangerZoneSettingsLazy = dynamic(
  () =>
    import("./danger-zone/DangerZoneSettings").then(
      (mod) => mod.DangerZoneSettings,
    ),
  {
    ssr: false,
    loading: () => <LazySettingsPanelFallback />,
  },
);

export function SettingsPageUI({
  filteredTabs,
  searchQuery,
  setSearchQuery,
  tabValue,
  onTabChange,
}: SettingsPageUIProps) {
  const visibleTabValues = new Set(
    filteredTabs.flatMap((category) => category.items.map((item) => item.value)),
  );

  return (
    <AppPageScaffold
      className="pb-24"
      header={
        <div
          className={cn(
            "grid items-start gap-x-3 gap-y-5 sm:gap-x-4",
            "grid-cols-[auto_minmax(0,1fr)]",
            "lg:[grid-template-columns:minmax(0,1fr)_fit-content(24rem)] lg:gap-x-10",
          )}
        >
          <div className="col-start-1 row-start-1 min-w-0 shrink-0">
            <BackButton fallback="/today" label="Back to Today" />
          </div>
          <div className="col-start-2 row-start-1 min-w-0 w-full max-w-md justify-self-end sm:max-w-lg lg:max-w-none">
            <SettingsExpandedSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
          <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-1 lg:row-start-2">
            <PageHeader
              title="Settings"
              description="Manage your facility preferences and configurations."
              className="min-w-0"
            />
          </div>
          <div className="col-span-2 flex min-w-0 justify-start lg:col-span-1 lg:col-start-2 lg:row-start-2">
            <div className="w-fit max-w-full">
              <SettingsPageHeaderUserMeta />
            </div>
          </div>
        </div>
      }
    >

      <div className="flex flex-col gap-5 md:gap-6">
        <SettingsProfileHeader />
        <Tabs
          value={tabValue}
          onValueChange={onTabChange}
          className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-10"
        >
        <aside className="w-full shrink-0 md:sticky md:top-4 md:w-56 lg:w-64">
          <TabsList className="flex h-auto w-full flex-row flex-wrap gap-0.5 overflow-x-hidden bg-transparent p-0 pb-1 md:flex-col md:flex-nowrap md:items-stretch md:overflow-visible md:pb-0">
            {filteredTabs.map((category, categoryIndex) => {
              const isDangerCategory = category.category === "Danger Zone";
              return (
                <div key={category.category}>
                  <div
                    className={cn(
                      "hidden md:block px-2 py-1.5 text-xs font-semibold uppercase tracking-wider mb-1",
                      categoryIndex > 0 && "mt-3",
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
                          "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm",
                          "rounded-[var(--radius)] whitespace-normal",
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

        <div className="min-w-0 flex-1 self-stretch">
          {visibleTabValues.has("general") && (
            <TabsContent value="general" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageClinic">
                <ClinicGeneralSettings />
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

          {visibleTabValues.has("subscription") && (
            <TabsContent value="subscription" className="mt-0 space-y-6">
              <RoleGuard requiredPermission="manageBilling">
                <SubscriptionSettingsLazy />
              </RoleGuard>
            </TabsContent>
          )}

          {visibleTabValues.has("availability") && (
            <TabsContent value="availability" className="mt-0 space-y-6">
              <RoleGuard requiredRole="DOCTOR">
                <div className="space-y-6">
                  <DoctorTimeAwaySettingsLazy />
                  <DoctorAvailabilitySettingsLazy />
                </div>
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

          {visibleTabValues.has("help-support") && (
            <TabsContent value="help-support" className="mt-0 space-y-6">
              <HelpSupportSettingsPanel />
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
    </AppPageScaffold>
  );
}
