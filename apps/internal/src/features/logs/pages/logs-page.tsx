import { useState, useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { AppPageScaffold, Badge, Button, DataState, Input, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { RefreshCw } from "lucide-react";
import { formatDateTime, enIN } from "@workspace/utils";
import { useApiQuery } from "@/hooks/use-api-query";

interface SystemLog { id: string; timestamp: string; level: string; module: string; message: string; details?: string; }

type PageSize = 25 | 50 | 100;

function isPageSize(value: number): value is PageSize {
  return value === 25 || value === 50 || value === 100;
}

export function LogsPage() {
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedLimit, setSelectedLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(selectedLimit));
    p.set("offset", String(offset));
    if (selectedLevel !== "ALL") p.set("level", selectedLevel);
    if (selectedModule !== "ALL") p.set("module", selectedModule);
    if (searchText) p.set("q", searchText);
    return `/api/internal/logs?${p.toString()}`;
  }, [selectedLimit, offset, selectedLevel, selectedModule, searchText]);

  const { data, isPending, isError, refetch } = useApiQuery<{ logs: SystemLog[]; total: number }>(params, {
    placeholderData: keepPreviousData,
  });
  const isLoading = isPending;
  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const totalCount = data?.total ?? 0;

  const moduleOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.module))).sort(), [logs]);

  return (
    <AppPageScaffold header={<PageHeader title="System Logs" description="View and filter application logs across all modules" size="compact"
      actions={<Button variant="outline" size="sm" onClick={() => { void refetch(); }} disabled={isLoading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>} />}>
      <DataState
        status={isError ? "error" : isLoading ? "loading" : "success"}
        loadingMessage="Loading logs…"
        errorMessage="We could not load the system logs. Please try again."
        onRetry={() => { void refetch(); }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Severity</label>
            <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setOffset(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Module</label>
            <Select value={selectedModule} onValueChange={(v) => { setSelectedModule(v); setOffset(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modules</SelectItem>
                {moduleOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <Input value={searchText} onChange={(e) => { setSearchText(e.target.value); setOffset(0); }} placeholder="Search messages…" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Page Size</label>
            <Select value={String(selectedLimit)} onValueChange={(v) => { const limit = Number(v); if (isPageSize(limit)) setSelectedLimit(limit); setOffset(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Message</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Loading logs…</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No matching logs found</TableCell></TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{formatDateTime(log.timestamp, undefined, { locale: enIN })}</TableCell>
                  <TableCell>
                    {log.level === "ERROR" ? <Badge variant="destructive">ERROR</Badge>
                      : log.level === "WARNING" ? <Badge variant="outline" className="text-warning border-warning">WARNING</Badge>
                      : log.level === "DEBUG" ? <Badge variant="outline">DEBUG</Badge>
                      : <Badge variant="secondary">INFO</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{log.module}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{log.message}</span>
                      {log.details && <span className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded w-fit">{log.details}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Showing {offset + 1}-{Math.min(offset + selectedLimit, totalCount)} of {totalCount}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || offset === 0} onClick={() => { setOffset(Math.max(0, offset - selectedLimit)); }}>Previous</Button>
            <Button variant="outline" size="sm" disabled={isLoading || offset + selectedLimit >= totalCount} onClick={() => { setOffset(offset + selectedLimit); }}>Next</Button>
          </div>
        </div>
      </DataState>
    </AppPageScaffold>
  );
}
