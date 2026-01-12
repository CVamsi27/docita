/**
 * Patient Stats Cards - Container Component
 * NOTE: This component is already mostly presentational.
 * In a real scenario, you might fetch statistics from an API endpoint.
 * For now, it expects statistics to be passed as a prop.
 */

export { PatientStatsCardsUI as PatientStatsCardsContainer } from "./PatientStatsCardsUI";

// Future: Add real container if statistics fetching is needed
// import { useQuery } from '@tanstack/react-query';
// import { PatientStatsCardsUI } from './PatientStatsCardsUI';
//
// export function PatientStatsCardsContainer({ patientId }: { patientId: string }) {
//   const { data, isLoading } = useQuery({
//     queryKey: ['patient-stats', patientId],
//     queryFn: () => api.get(`/patients/${patientId}/statistics`),
//   });
//
//   return <PatientStatsCardsUI statistics={data} loading={isLoading} />;
// }
