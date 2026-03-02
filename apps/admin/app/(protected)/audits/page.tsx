import { SystemLogsPage } from "@/features/logs/system-logs-page";

export default function AuditsPage() {
  return (
    <SystemLogsPage
      title="Audit Logs"
      description="Persisted activity and monitoring errors across the platform."
      defaultLimit={100}
      moduleColumnWidthClass="w-[170px]"
    />
  );
}
