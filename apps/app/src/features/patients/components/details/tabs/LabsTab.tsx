import { formatDate } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardHeader, CardTitle, DataState, StatusBadge } from "@workspace/ui/components";
import { ExternalLink, FlaskConical } from "lucide-react";
import { Feature } from "@workspace/types";
import { useLabTestOrders } from "@workspace/data-access";
import { FeatureGate } from "@/components/auth/feature-gate";

interface LabsTabProps {
  patientId: string;
}

export function LabsTab({ patientId }: LabsTabProps) {
  return (
    <FeatureGate feature={Feature.LAB_TESTS}>
      <LabsTabContent patientId={patientId} />
    </FeatureGate>
  );
}

function LabsTabContent({ patientId }: LabsTabProps) {
  const { t } = useTranslation("Patients.labsTab");
  const {
    data: ordersResponse,
    isLoading,
    isError,
    refetch,
  } = useLabTestOrders({ patientId, limit: 100 });

  const orders = ordersResponse?.items ?? [];

  if (isLoading) return <DataState status="loading" loadingMessage={t("loadingMessage")} />;

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage={t("errorMessage")}
        onRetry={() => refetch()}
      />
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={FlaskConical}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const orderedAt = order.createdAt
          ? formatDate(order.createdAt, "EEE, d MMM yyyy")
          : "";
        const completedAt = order.completedAt
          ? formatDate(order.completedAt, "d MMM yyyy")
          : null;
        return (
          <Card key={order.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-warning" />
                    {order.labTest?.name ?? t("labTestFallback")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("orderedLabel", { date: orderedAt })}
                    {order.doctor?.name
                      ? ` · ${t("doctorPrefix", { name: order.doctor.name })}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" className="shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.labTest?.category && (
                <p className="text-xs text-muted-foreground">
                  {t("categoryLabel", { value: order.labTest.category })}
                </p>
              )}
              {completedAt && (
                <p className="text-xs text-muted-foreground">
                  {t("completedLabel", { date: completedAt })}
                </p>
              )}
              {order.notes && (
                <p className="text-xs text-foreground/80">{order.notes}</p>
              )}
              {order.resultUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <a
                    href={order.resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    {t("viewResultButton")}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
