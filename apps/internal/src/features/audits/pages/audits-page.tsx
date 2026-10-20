import { AppPageScaffold, Badge, Button, DataState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";
import { formatDateTime, enIN } from "@workspace/utils";
import { useApiQuery } from "@/hooks/use-api-query";

interface AuditLog { id: string; createdAt: string; action: string; resource?: string; resourceId?: string; clinicId?: string; userId?: string; status?: string; }

export function AuditsPage() {
  const { data: logs = [], isLoading, isError, refetch } = useApiQuery<AuditLog[]>(
    // The client baseURL is /api/v1 (versioned API), so the bare path is
    // correct here — the audit-logs controller is not under /internal/.
    "/audit-logs?limit=100",
  );

  return (
    <AppPageScaffold header={<PageHeader title="Audit Logs" description="Track administrative actions and system events"
      actions={<Button variant="outline" size="sm" onClick={() => { void refetch(); }} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh</Button>} />}>
      <DataState status={isError ? "error" : isLoading ? "loading" : logs.length === 0 ? "empty" : "success"}
        loadingMessage="Loading audit logs…" emptyTitle="No audit logs found" emptyDescription="Log entries will appear as admin actions are performed."
        errorMessage="We could not load the audit log. Please try again." onRetry={() => { void refetch(); }}>
        <div className="rounded-md border">
          <Table><TableHeader><TableRow>
            <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Clinic</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt, undefined, { locale: enIN })}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.resource ? `${log.resource}${log.resourceId ? ` · ${log.resourceId}` : ""}` : "—"}</TableCell>
                <TableCell className="font-mono text-xs">{log.clinicId || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{log.userId || "—"}</TableCell>
                <TableCell><Badge variant={log.status === "SUCCESS" ? "secondary" : "destructive"}>{log.status === "SUCCESS" ? "Success" : "Failed"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing the {logs.length} most recent entries</p>
      </DataState>
    </AppPageScaffold>
  );
}
