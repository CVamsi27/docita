import { LogOut, Search, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
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

import { useAuth } from "@/lib/auth-context";

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

export function SettingsPageUI({
  filteredTabs,
  searchQuery,
  setSearchQuery,
  defaultTab,
  firstMatchingTab,
}: SettingsPageUIProps) {
  const { logout } = useAuth();
  const visibleTabValues = new Set(
    filteredTabs.flatMap((category) => category.items.map((item) => item.value)),
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
      {}
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

        <div className="flex items-center gap-4">
          {}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue={defaultTab}
        value={searchQuery && firstMatchingTab ? firstMatchingTab : undefined}
        className="flex flex-col md:flex-row gap-6 lg:gap-10"
      >
        <aside className="md:w-56 lg:w-64 shrink-0">
          <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 gap-0.5 items-stretch">
            {filteredTabs.map((category) => (
              <div key={category.category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1 mt-3 first:mt-0">
                  {category.category}
                </div>
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className={cn(
                        "justify-start px-3 py-2.5 gap-3 w-full",
                        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
                        "hover:bg-muted/50 transition-colors",
                        "rounded-lg",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground hidden lg:block">
                          {item.description}
                        </span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </div>
            ))}
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
        </div>
      </Tabs>
    </div>
  );
}
