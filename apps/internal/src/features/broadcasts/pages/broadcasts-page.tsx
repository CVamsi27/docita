import { useState, useMemo, useEffect } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, DataState, Input, Label, PageHeader, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { Megaphone, Upload } from "lucide-react";
import { formatCompactDistanceToNow } from "@workspace/utils";
import { apiGet, apiPost } from "@/lib/api/api-client";

interface BroadcastJob { id: string; title: string; audienceLabel?: string; status: string; sentCount: number; totalCount: number; failedCount: number; createdAt: string; }

const PRESETS = [
  { id: "all_clinics", label: "All Clinic Admins", description: "Send to all clinic admin users", metaTemplateName: "broadcast_all_admins", body: "Dear clinic admin, please find the latest update from Docita." },
  { id: "all_doctors", label: "All Doctors", description: "Send to all doctors across clinics", metaTemplateName: "broadcast_all_doctors", body: "Dear doctor, please find the latest update from Docita." },
  { id: "expiring_trials", label: "Expiring Trials", description: "Clinics whose free trial is ending soon", metaTemplateName: "broadcast_expiring_trials", body: "Your free trial is ending soon. Please upgrade to continue using Docita." },
];

export function BroadcastsPage() {
  const [presetId, setPresetId] = useState("all_clinics");
  const [title, setTitle] = useState("");
  const [messageOverride, setMessageOverride] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BroadcastJob[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedPreset = useMemo(() => PRESETS.find((p) => p.id === presetId), [presetId]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiGet<BroadcastJob[]>("/api/internal/broadcasts");
      setJobs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchJobs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/api/internal/broadcasts", {
        presetId,
        title: title.trim() || (selectedPreset?.label ?? "Broadcast"),
        useTemplate,
        message: messageOverride,
      });
      setCsvFileName(null);
      setTitle("");
      setMessageOverride("");
      await fetchJobs();
    } catch { /* ignore */ }
  };

  return (
    <AppPageScaffold header={<PageHeader title="Broadcasts" description="Send WhatsApp messages to clinics and users" size="compact" />}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader><CardTitle>New Broadcast</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
              <div className="space-y-2">
                <Label>Audience Preset</Label>
                <Select value={presetId} onValueChange={setPresetId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedPreset?.description && <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>}
              </div>

              <div className="space-y-2">
                <Label>Broadcast Title</Label>                  <Input value={title} onChange={(e) => { setTitle(e.target.value); }} placeholder="Enter a title for this broadcast" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="useTemplate" checked={useTemplate} onCheckedChange={(checked) => { setUseTemplate(checked === true); }} />
                  <Label htmlFor="useTemplate">Use WhatsApp template</Label>
                </div>
                {!useTemplate && (
                  <Textarea value={messageOverride} onChange={(e) => { setMessageOverride(e.target.value); }}
                    placeholder="Enter custom message…" rows={4} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Recipients CSV</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => document.getElementById("csv-upload")?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Upload CSV
                  </Button>
                  <input id="csv-upload" type="file" accept=".csv" className="hidden"
                    onChange={(e) => { setCsvFileName(e.target.files?.[0]?.name ?? null); }} />
                  {csvFileName && <span className="text-sm text-muted-foreground">{csvFileName}</span>}
                </div>
              </div>

              <Button type="submit">Send Broadcast</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Broadcast History</CardTitle></CardHeader>
          <CardContent>
            <DataState status={loading ? "loading" : jobs.length === 0 ? "empty" : "success"}
              loadingMessage="Loading broadcasts…" emptyTitle="No broadcasts yet" emptyDescription="Your broadcast history will appear here." emptyIcon={Megaphone}>
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li key={job.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium">{job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{job.audienceLabel ?? "No audience label"}</p>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Sent: {job.sentCount}/{job.totalCount}</span>
                      {job.failedCount > 0 && <span className="text-destructive">{job.failedCount} failed</span>}
                      <span>{formatCompactDistanceToNow(job.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </DataState>
          </CardContent>
        </Card>
      </div>
    </AppPageScaffold>
  );
}
