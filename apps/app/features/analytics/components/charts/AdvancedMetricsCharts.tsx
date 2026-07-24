import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { RevenueMetricsPoint, AppointmentMetricsData, PatientDemographicsData, RevenueTrendsCard, AppointmentPerformanceCard, PatientDemographicsCard, DoctorPerformanceCard } from "./AdvancedMetricsChartsSections";

interface AdvancedMetricsChartsProps {
  revenueMetrics: RevenueMetricsPoint[];
  appointmentMetrics?: AppointmentMetricsData;
  patientDemographics?: PatientDemographicsData;
  doctorPerformance: Array<{
    doctorId: string;
    doctorName: string;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    completionRate: number;
    revenue: number;
    avgRevenuePerAppointment: number;
  }>;
  revenueLoading: boolean;
  appointmentLoading: boolean;
  demographicsLoading: boolean;
  doctorPerformanceLoading: boolean;
}

export function AdvancedMetricsCharts({
  revenueMetrics,
  appointmentMetrics,
  patientDemographics,
  doctorPerformance,
  revenueLoading,
  appointmentLoading,
  demographicsLoading,
  doctorPerformanceLoading,
}: AdvancedMetricsChartsProps) {
  const { formatCurrency } = useClinicCurrency();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RevenueTrendsCard
        revenueMetrics={revenueMetrics}
        revenueLoading={revenueLoading}
      />
      <AppointmentPerformanceCard
        appointmentMetrics={appointmentMetrics}
        appointmentLoading={appointmentLoading}
      />
      <PatientDemographicsCard
        patientDemographics={patientDemographics}
        demographicsLoading={demographicsLoading}
      />
      <DoctorPerformanceCard
        doctorPerformance={doctorPerformance}
        doctorPerformanceLoading={doctorPerformanceLoading}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
