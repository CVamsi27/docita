"use client";

import { useTranslation } from "react-i18next";
import { useWhatsappStats } from "@workspace/data-access";
import { Card, CardContent, CardHeader, CardTitle, DataState } from "@workspace/ui/components";

export function WhatsappDeliveryView() {
  const { t } = useTranslation("WhatsApp");
  const stats = useWhatsappStats();
  if (stats.isLoading) return (
      <DataState status="loading" loadingMessage={t("delivery.loading")} />
    );
  if (stats.isError || !stats.data) {
    return (
      <DataState
        status="error"
        errorMessage={t("delivery.error")}
        onRetry={() => void stats.refetch()}
      />
    );
  }
  const cards = [
    [t("delivery.outboundMessages"), stats.data.outboundLast30Days ?? 0],
    [
      t("delivery.deliveryRate"),
      stats.data.deliveryRate == null
        ? t("delivery.unavailable")
        : `${stats.data.deliveryRate}%`,
    ],
    [
      t("delivery.responseRate"),
      stats.data.responseRate == null
        ? t("delivery.unavailable")
        : `${stats.data.responseRate}%`,
    ],
    [t("delivery.staleDeliveries"), stats.data.staleDeliveryCount ?? 0],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
