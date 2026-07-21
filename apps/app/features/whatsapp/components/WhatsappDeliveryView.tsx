"use client";

import { useWhatsappStats } from "@workspace/data-access";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataState
} from "@workspace/ui/components";

export function WhatsappDeliveryView() {
  const stats = useWhatsappStats();
  if (stats.isLoading) return (
      <DataState status="loading" loadingMessage="Loading delivery health..." />
    );
  if (stats.isError || !stats.data) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load WhatsApp delivery health."
        onRetry={() => void stats.refetch()}
      />
    );
  }
  const cards = [
    ["Outbound messages", stats.data.outboundLast30Days ?? 0],
    [
      "Delivery rate",
      stats.data.deliveryRate == null
        ? "Unavailable"
        : `${stats.data.deliveryRate}%`,
    ],
    [
      "Response rate",
      stats.data.responseRate == null
        ? "Unavailable"
        : `${stats.data.responseRate}%`,
    ],
    ["Stale deliveries", stats.data.staleDeliveryCount ?? 0],
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
