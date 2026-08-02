import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/api-client";
import { CardGridSkeleton } from "@/components/loaders/page-skeleton";
import { AppPageScaffold, Button, DataState, PageHeader } from "@workspace/ui/components";
import { Hospital } from "lucide-react";
import { ReferralsPageContent } from "@/features/referrals/components/ReferralsPageContent";
import { FollowUpsPageContent } from "@/features/follow-ups/components/FollowUpsPageContent";

export function ReferralsPage() {
  return <ReferralsPageContent />;
}

export function FollowUpsPage() {
  return <FollowUpsPageContent />;
}

interface HospitalBed {
  id: string;
  ward: string;
  roomNumber: string;
  bedNumber: string;
  status: string;
  patientName?: string;
}

export function HospitalBedsPage() {
  const { t } = useTranslation("Referrals");
  const navigate = useNavigate();
  const { data: beds, isLoading, isError, refetch } = useQuery<HospitalBed[]>({
    queryKey: ["hospital-beds"],
    queryFn: () => apiFetch<HospitalBed[]>("/hospital/beds"),
  });

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("hospitalBeds.title")}
          description={t("hospitalBeds.description")}
          actions={
            <Button size="sm" onClick={() => navigate("/hospital/beds/manage")}>
              <Hospital className="mr-1.5 h-4 w-4" />{t("hospitalBeds.manageBeds")}
            </Button>
          }
        />
      }
    >
      {isLoading ? (
        <CardGridSkeleton cardCount={6} columns={3} />
      ) : isError ? (
        <DataState status="error" errorMessage={t("hospitalBeds.error")} onRetry={() => refetch()} className="min-h-[40vh]" />
      ) : !beds || beds.length === 0 ? (
        <DataState status="empty" emptyIcon={Hospital} emptyTitle={t("hospitalBeds.emptyTitle")} emptyDescription={t("hospitalBeds.emptyDescription")} className="min-h-[40vh]" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {beds.map((bed) => (
            <div key={bed.id} className={`rounded-lg border p-4 ${bed.status === "OCCUPIED" ? "border-primary/30 bg-primary/5" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{bed.bedNumber}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  bed.status === "AVAILABLE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  bed.status === "OCCUPIED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {bed.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{bed.ward} • {bed.roomNumber}</p>
              {bed.patientName && <p className="text-xs font-medium mt-1">{bed.patientName}</p>}
            </div>
          ))}
        </div>
      )}
    </AppPageScaffold>
  );
}

export function SpecialtyPage() {
  const { t } = useTranslation("Referrals");
  const navigate = useNavigate();
  return (
    <AppPageScaffold header={<PageHeader title={t("specialty.title")} description={t("specialty.description")} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/specialty/dental-charts")}>
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mb-2">D</div>
          <p className="text-sm font-medium">{t("specialty.dentalCharts")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("specialty.dentalChartsDescription")}</p>
        </div>
      </div>
    </AppPageScaffold>
  );
}

export function DentalChartsPage() {
  const { t } = useTranslation("Referrals");
  return (
    <AppPageScaffold header={<PageHeader title={t("dental.title")} description={t("dental.description")} />}>
      <DataState status="empty" emptyTitle={t("dental.emptyTitle")} emptyDescription={t("dental.emptyDescription")} className="min-h-[40vh]" />
    </AppPageScaffold>
  );
}
