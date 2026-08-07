import { useState, useEffect } from "react";
import { AppPageScaffold, Badge, Button, DataState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";
import { formatInternalTimestamp } from "../../../lib/formatters";
import { apiGet } from "@/lib/api/api-client";

interface AuditLog { id: string; createdAt: string; action: string; resource?: string; resourceId?: string; clinicId?: string; userId?: string; status?: string; }

export function AuditsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // The client baseURL is /api/v1 (versioned API), so the bare path is
      // correct here — the audit-logs controller is not under /internal/.
      const data = await apiGet<AuditLog[]>("/audit-logs?limit=100");
      setLogs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchLogs(); }, []);

  return (
    <AppPageScaffold header={<PageHeader title="Audit Logs" description="Track administrative actions and system events"
      actions={<Button variant="outline" size="sm" onClick={() => { void fetchLogs(); }} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>} />}>
      <DataState status={loading ? "loading" : logs.length === 0 ? "empty" : "success"}
        loadingMessage="Loading audit logs…" emptyTitle="No audit logs found" emptyDescription="Log entries will appear as admin actions are performed.">
        <div className="rounded-md border">
          <Table><TableHeader><TableRow>
            <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Clinic</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatInternalTimestamp(log.createdAt)}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.resource ? `${log.resource}${log.resourceId ? ` \u00b7 ${log.resourceId}` : ""}` : "\u2014"}</TableCell>
                <TableCell className="font-mono text-xs">{log.clinicId || "\u2014"}</TableCell>
                <TableCell className="font-mono text-xs">{log.userId || "\u2014"}</TableCell>
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
