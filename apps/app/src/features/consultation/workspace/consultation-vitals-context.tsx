import { createContext, useContext } from "react";

export interface ConsultationVitalsContextValue {
  openVitals: () => void;
}

export const ConsultationVitalsContext =
  createContext<ConsultationVitalsContextValue | null>(null);

export function useConsultationVitals(): ConsultationVitalsContextValue {
  const ctx = useContext(ConsultationVitalsContext);
  if (!ctx) throw new Error(
    "useConsultationVitals must be used within ConsultationVitalsProvider",
  );
  return ctx;
}
