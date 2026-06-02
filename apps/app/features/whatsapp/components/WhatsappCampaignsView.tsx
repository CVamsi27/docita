"use client";

import { useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import {
  useCancelClinicWhatsappCampaign,
  useClinicWhatsappCampaigns,
  useCreateClinicWhatsappCampaign,
  usePatients,
  usePreviewClinicWhatsappCampaign,
} from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { getPatientFullName } from "@workspace/utils";

export function WhatsappCampaignsView() {
  const { user } = useAuth();
  const campaigns = useClinicWhatsappCampaigns();
  const patients = usePatients({ limit: 50 });
  const preview = usePreviewClinicWhatsappCampaign();
  const createCampaign = useCreateClinicWhatsappCampaign();
  const cancelCampaign = useCancelClinicWhatsappCampaign();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canManage = user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (campaigns.isLoading) {
    return <DataState status="loading" loadingMessage="Loading campaigns..." />;
  }
  if (campaigns.isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load campaigns."
        onRetry={() => void campaigns.refetch()}
      />
    );
  }

  const handleCreate = () => {
    if (!title.trim() || !templateName.trim() || selectedIds.length === 0)
      return;
    createCampaign.mutate(
      {
        title: title.trim(),
        templateName: templateName.trim(),
        languageCode: "en",
        patientIds: selectedIds,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setTemplateName("");
          setSelectedIds([]);
          preview.reset();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Approved-template outreach only. Consent is checked again at dispatch.
        </p>
        {canManage ? (
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New campaign
          </Button>
        ) : null}
      </div>
      {!campaigns.data?.length ? (
        <DataState
          status="empty"
          emptyIcon={Megaphone}
          emptyTitle="No clinic campaigns yet"
          emptyDescription="Create approved-template outreach for consenting patients."
        />
      ) : (
        <div className="grid gap-3">
          {campaigns.data.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">{campaign.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.templateName} · {campaign.sentCount}/
                    {campaign.totalCount} sent
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{campaign.status}</Badge>
                  {canManage &&
                  ["PENDING", "RUNNING"].includes(campaign.status) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => cancelCampaign.mutate({ id: campaign.id })}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New WhatsApp campaign</DialogTitle>
            <DialogDescription>
              Select patients and an approved Meta template. Patients without
              WhatsApp consent are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-title">Campaign name</Label>
              <Input
                id="campaign-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-template">Approved template name</Label>
              <Input
                id="campaign-template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter approved template name"
              />
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
              {patients.data?.items.map((patient) => {
                const patientId = patient.id;
                return patientId ? (
                  <label
                    key={patient.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(patientId)}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? [...current, patientId]
                            : current.filter((id) => id !== patientId),
                        )
                      }
                    />
                    {getPatientFullName(patient)}
                  </label>
                ) : null;
              })}
            </div>
            {preview.data ? (
              <p className="text-sm text-muted-foreground">
                {preview.data.eligibleCount} eligible ·{" "}
                {preview.data.skippedCount} skipped
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={selectedIds.length === 0 || preview.isPending}
              onClick={() => preview.mutate({ patientIds: selectedIds })}
            >
              Review recipients
            </Button>
            <Button
              type="button"
              disabled={!preview.data || createCampaign.isPending}
              onClick={handleCreate}
            >
              Create campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
