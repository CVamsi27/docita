"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VitalsModal } from "@/features/consultation/components/modals/VitalsModal";

interface ConsultationVitalsContextValue {
  openVitals: () => void;
}

const ConsultationVitalsContext =
  createContext<ConsultationVitalsContextValue | null>(null);

export function useConsultationVitals(): ConsultationVitalsContextValue {
  const ctx = useContext(ConsultationVitalsContext);
  if (!ctx) {
    throw new Error(
      "useConsultationVitals must be used within ConsultationVitalsProvider",
    );
  }
  return ctx;
}

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
      queryKey: ["appointments", appointmentId],
    });
    queryClient.invalidateQueries({ queryKey: ["patient-snapshot"] });
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
