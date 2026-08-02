import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, DataState } from "@workspace/ui/components";
import { ClipboardList } from "lucide-react";
import { useAppointments } from "@workspace/data-access";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { ConsultationListHeader, ConsultationListItem, ConsultationListPagination } from "./ConsultationHistoryListSections";

const PAGE_SIZE = 25;

interface ConsultationHistoryDoctor {
  id: string;
  name: string;
}

interface ConsultationHistoryListProps {
  scopedDoctorId?: string;
  canViewAllDoctors?: boolean;
  selectedDoctorId?: string;
  onDoctorSelect?: (doctorId: string | undefined) => void;
  doctorsList?: ConsultationHistoryDoctor[];
}

export function ConsultationHistoryList({
  scopedDoctorId,
  canViewAllDoctors = false,
  selectedDoctorId,
  onDoctorSelect,
  doctorsList = [],
}: ConsultationHistoryListProps) {
  const { user } = useAuth();
  const { canViewPrescriptions, canViewInvoices, canStartConsultation } =
    usePermissions();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [scopedDoctorId]);

  const { data, isLoading, isError, refetch } = useAppointments({
    status: "completed",
    limit: PAGE_SIZE,
    page,
    sortOrder: "desc",
    ...(scopedDoctorId ? { doctorId: scopedDoctorId } : {}),
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalCount = data?.count ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = Boolean(data?.hasMore);

  const handlePrevPage = useCallback(
    () => setPage((current) => Math.max(1, current - 1)),
    [],
  );
  const handleNextPage = useCallback(
    () => setPage((current) => current + 1),
    [],
  );

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <ConsultationListHeader
        doctorsList={doctorsList}
        canViewAllDoctors={canViewAllDoctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorSelect={onDoctorSelect}
      />
      <CardContent className="p-0">
        <DataState
          status={
            isLoading
              ? "loading"
              : isError
                ? "error"
                : items.length === 0
                  ? "empty"
                  : "success"
          }
          loadingMessage="Loading recent consultations…"
          errorMessage="We could not load the consultation list. Please try again."
          onRetry={() => refetch()}
          emptyTitle="No completed consultations yet"
          emptyDescription="Once you complete a consultation, it will appear here with quick access to prescription and invoice records."
          emptyIcon={ClipboardList}
          className="min-h-[200px]"
        >
          <ul className="divide-y divide-border/60">
            {items.map((apt) => (
              <ConsultationListItem
                key={apt.id}
                appointment={apt}
                canViewPrescriptions={canViewPrescriptions}
                canViewInvoices={canViewInvoices}
                canStartConsultation={canStartConsultation}
                userId={user?.id}
              />
            ))}
          </ul>
          {totalCount > 0 ? (
            <ConsultationListPagination
              page={page}
              totalCount={totalCount}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              isLoading={isLoading}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
