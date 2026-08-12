import { useNavigate } from "react-router";
import { AppPageScaffold, Button, PageHeader } from "@workspace/ui/components";
import { ArrowLeft, UserPlus } from "lucide-react";
import { MemberManagementSettings } from "@/features/settings/components/management/MemberManagementSettings";
import { JoinRequestsSettingsPanel } from "@/features/settings/components/management/JoinRequestsSettingsPanel";

export function SettingsTeamPage() {
  const navigate = useNavigate();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Team Settings"
          description="Manage your clinic team members and roles."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/settings/team/join-requests")}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join requests
              </Button>
              <Button size="sm" onClick={() => navigate("/settings")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          }
        />
      }
    >
      <MemberManagementSettings />
    </AppPageScaffold>
  );
}

function SettingsBackButtonPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={title}
          description={description}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
      }
    >
      {children}
    </AppPageScaffold>
  );
}

export function SettingsTeamJoinRequestsPage() {
  return (
    <SettingsBackButtonPage
      title="Join Requests"
      description="Review and manage team join requests."
    >
      <JoinRequestsSettingsPanel />
    </SettingsBackButtonPage>
  );
}
