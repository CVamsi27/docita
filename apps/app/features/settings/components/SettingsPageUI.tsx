import {
    ArrowLeft,
    Search,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@workspace/ui/components/tabs";
import { RoleGuard } from "@/features/_shared/components/role-guard";
import {
    AppearanceSettings,
    BillingSettings,
    ClinicGeneralSettings,
    CustomFieldsSettings,
    DoctorAvailabilitySettings as DoctorAvailabilitySettingsDynamic,
    MemberManagementSettings,
    NotificationSettings,
    ReminderSettings,
    SecuritySettings,
    SubscriptionSettings as SubscriptionSettingsDynamic,
    TemplatesSettings as TemplatesSettingsDynamic,
    WhatsAppAutomationSettings,
} from "@/features/settings/stubs";
import {
    PrescriptionDefaultsSettings,
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

export function SettingsPageUI({
    filteredTabs,
    searchQuery,
    setSearchQuery,
    defaultTab,
    firstMatchingTab,
}: SettingsPageUIProps) {
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Link>
                        </Button>
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

                {/* Search */}
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
                    <TabsContent value="general" className="mt-0 space-y-6">
                        <RoleGuard requiredPermission="manageClinic">
                            <ClinicGeneralSettings />
                        </RoleGuard>
                    </TabsContent>

                    <TabsContent value="billing" className="mt-0 space-y-6">
                        <BillingSettings />
                    </TabsContent>

                    <TabsContent value="subscription" className="mt-0 space-y-6">
                        <SubscriptionSettingsDynamic />
                    </TabsContent>

                    <TabsContent value="members" className="mt-0 space-y-6">
                        <RoleGuard requiredPermission="manageStaff">
                            <MemberManagementSettings />
                        </RoleGuard>
                    </TabsContent>

                    <TabsContent value="availability" className="mt-0 space-y-6">
                        <DoctorAvailabilitySettingsDynamic />
                    </TabsContent>

                    <TabsContent value="queue" className="mt-0 space-y-6">
                        <QueueSettings />
                    </TabsContent>

                    <TabsContent value="prescriptions" className="mt-0 space-y-6">
                        <PrescriptionDefaultsSettings />
                    </TabsContent>

                    <TabsContent value="templates" className="mt-0">
                        <TemplatesSettingsDynamic />
                    </TabsContent>

                    <TabsContent value="custom-fields" className="mt-0">
                        <CustomFieldsSettings />
                    </TabsContent>

                    <TabsContent value="reminders" className="mt-0">
                        <ReminderSettings />
                    </TabsContent>

                    <TabsContent value="whatsapp" className="mt-0">
                        <WhatsAppAutomationSettings />
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0">
                        <NotificationSettings />
                    </TabsContent>

                    <TabsContent value="security" className="mt-0">
                        <SecuritySettings />
                    </TabsContent>

                    <TabsContent value="appearance" className="mt-0">
                        <AppearanceSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
