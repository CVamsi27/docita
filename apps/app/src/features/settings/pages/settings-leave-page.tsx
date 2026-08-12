import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { LeaveManagementSettings } from "@/features/settings/components/leave/LeaveManagementSettings";
import { PageMeta } from "@/components/layout/page-meta";

export function SettingsLeavePage() {
  return (
    <>
      <PageMeta
        title="Leave"
        description="Leave requests, balances, and plans"
      />
      <AppPageScaffold
        header={
          <PageHeader
            title="Leave"
            description="Submit leave, track balances, and configure leave plans."
          />
        }
      >
        <LeaveManagementSettings />
      </AppPageScaffold>
    </>
  );
}
