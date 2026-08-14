import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import { VitalsModal } from "@/features/consultation/components/modals/VitalsModal";
import { ConsultationVitalsContext } from "./consultation-vitals-context";

interface ConsultationVitalsProviderProps {
  children: ReactNode;
  appointmentId: string;
  patientName: string;
}

export function ConsultationVitalsProvider({
  children,
  appointmentId,
  patientName,
}: ConsultationVitalsProviderProps) {
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const queryClient = useQueryClient();

  const openVitals = useCallback(() => setVitalsOpen(true), []);

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.detail(appointmentId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.patientSnapshot.all(),
    });
  }, [appointmentId, queryClient]);

  const value = useMemo(() => ({ openVitals }), [openVitals]);

  return (
    <ConsultationVitalsContext.Provider value={value}>
      {children}
      <VitalsModal
        open={vitalsOpen}
        onOpenChange={setVitalsOpen}
        appointmentId={appointmentId}
        patientName={patientName}
        onSaved={handleSaved}
      />
    </ConsultationVitalsContext.Provider>
  );
}
