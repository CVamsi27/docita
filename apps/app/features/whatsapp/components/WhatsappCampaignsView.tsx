"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import {
  useCancelClinicWhatsappCampaign,
  useClinicWhatsappCampaigns,
} from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin } from "@/lib/auth/permissions";
import { WhatsappCampaignCreateDialog } from "./WhatsappCampaignCreateDialog";

export function WhatsappCampaignsView() {
  const { user } = useAuth();
  const campaigns = useClinicWhatsappCampaigns();
  const cancelCampaign = useCancelClinicWhatsappCampaign();
  const [open, setOpen] = useState(false);
  const canManage = isAdmin(user?.role);

  if (campaigns.isLoading) return <DataState status="loading" loadingMessage="Loading campaigns..." />;
  if (campaigns.isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load campaigns."
        onRetry={() => void campaigns.refetch()}
      />
    );
  }

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
      <WhatsappCampaignCreateDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
