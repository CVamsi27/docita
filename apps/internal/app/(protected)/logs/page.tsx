import { SystemLogsPage } from "@/features/logs/system-logs-page";

export default function LogsPage() {
  return (
    <SystemLogsPage
      title="System Logs"
      description="View and filter system events and errors"
      defaultLimit={50}
      moduleColumnWidthClass="w-[150px]"
    />
  );
}
