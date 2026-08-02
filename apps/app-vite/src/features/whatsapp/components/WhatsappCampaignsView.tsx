"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus } from "lucide-react";
import { useCancelClinicWhatsappCampaign, useClinicWhatsappCampaigns } from "@workspace/data-access";
import { Badge, Button, Card, CardContent, DataState } from "@workspace/ui/components";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin } from "@/lib/auth/permissions";
import { WhatsappCampaignCreateDialog } from "./WhatsappCampaignCreateDialog";

export function WhatsappCampaignsView() {
  const { t } = useTranslation("WhatsApp");
  const { user } = useAuth();
  const campaigns = useClinicWhatsappCampaigns();
  const cancelCampaign = useCancelClinicWhatsappCampaign();
  const [open, setOpen] = useState(false);
  const canManage = isAdmin(user?.role);

  if (campaigns.isLoading) return <DataState status="loading" loadingMessage={t("campaigns.loading")} />;
  if (campaigns.isError) {
    return (
      <DataState
        status="error"
        errorMessage={t("campaigns.error")}
        onRetry={() => void campaigns.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("campaigns.consentNote")}
        </p>
        {canManage ? (
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            {t("campaigns.newCampaign")}
          </Button>
        ) : null}
      </div>
      {!campaigns.data?.length ? (
        <DataState
          status="empty"
          emptyIcon={Megaphone}
          emptyTitle={t("campaigns.emptyTitle")}
          emptyDescription={t("campaigns.emptyDescription")}
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
                    {campaign.totalCount} {t("campaigns.sent")}
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
                      {t("campaigns.cancelButton")}
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
