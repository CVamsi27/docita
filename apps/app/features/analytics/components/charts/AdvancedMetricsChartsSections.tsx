// jscpd:ignore-start
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { CalendarDays, TrendingUp, Users } from "lucide-react";
import type { AppointmentSnapshot } from "@workspace/types";
import {
  Bar,
// jscpd:ignore-end
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, EmptyState, LoadingSpinner } from "./chart-helpers";

export interface RevenueMetricsPoint {
  date: string;
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
}

export type AppointmentMetricsData = AppointmentSnapshot;

export interface PatientDemographicsData {
  totalPatients: number;
  newPatients: number;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
}

interface DoctorPerformanceEntry {
  doctorId: string;
  doctorName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  revenue: number;
  avgRevenuePerAppointment: number;
}

/**
 * Phase 3 (per-feature): apps/app Analytics > Advanced Metrics
 * charts. 10 literals converted to
 * useTranslations("Analytics.advancedMetrics").
 */
function useAdvancedMetricsTranslations() {
  return useTranslations("Analytics.advancedMetrics");
}

interface RevenueTrendsCardProps {
  revenueMetrics: RevenueMetricsPoint[];
  revenueLoading: boolean;
}

export function RevenueTrendsCard({
  revenueMetrics,
  revenueLoading,
}: RevenueTrendsCardProps) {
  const t = useAdvancedMetricsTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenueTrendsTitle")}</CardTitle>
        <CardDescription>
          {t("revenueTrendsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {revenueLoading ? (
          <LoadingSpinner />
        ) : revenueMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueMetrics}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={TrendingUp}
            label={t("revenueEmptyTitle")}
            sublabel={t("revenueEmptySubtitle")}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface AppointmentPerformanceCardProps {
  appointmentMetrics?: AppointmentMetricsData;
  appointmentLoading: boolean;
}

export function AppointmentPerformanceCard({
  appointmentMetrics,
  appointmentLoading,
}: AppointmentPerformanceCardProps) {
  const t = useAdvancedMetricsTranslations();
  const appointmentChartData = appointmentMetrics
    ? [
        { name: t("appointmentBooked"), value: appointmentMetrics.booked },
        { name: t("appointmentCompleted"), value: appointmentMetrics.completed },
        { name: t("appointmentCancelled"), value: appointmentMetrics.cancelled },
        { name: t("appointmentNoShow"), value: appointmentMetrics.noShow },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appointmentPerformanceTitle")}</CardTitle>
        <CardDescription>
          {t("appointmentPerformanceDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80 space-y-4">
        {appointmentLoading ? (
          <LoadingSpinner />
        ) : appointmentMetrics ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                {t("fillRateLabel", { rate: appointmentMetrics.fillRate })}
              </div>
              <div className="rounded-md border p-2">
                {t("completionRateLabel", { rate: appointmentMetrics.completionRate })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height="75%">
              <BarChart data={appointmentChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {appointmentChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <EmptyState
            icon={CalendarDays}
            label={t("appointmentEmptyTitle")}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface PatientDemographicsCardProps {
  patientDemographics?: PatientDemographicsData;
  demographicsLoading: boolean;
}

export function PatientDemographicsCard({
  patientDemographics,
  demographicsLoading,
}: PatientDemographicsCardProps) {
  const t = useAdvancedMetricsTranslations();
  const demographicsChartData = patientDemographics
    ? Object.entries(patientDemographics.genderDistribution).map(
        ([name, value]) => ({ name, value }),
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("demographicsTitle")}</CardTitle>
        <CardDescription>{t("demographicsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="h-80 space-y-4">
        {demographicsLoading ? (
          <LoadingSpinner />
        ) : patientDemographics && demographicsChartData.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                {t("demographicsTotalLabel", { count: patientDemographics.totalPatients })}
              </div>
              <div className="rounded-md border p-2">
                {t("demographicsNewLabel", { count: patientDemographics.newPatients })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={demographicsChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  isAnimationActive={false}
                >
                  {demographicsChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </>
        ) : (
          <EmptyState
            icon={Users}
            label={t("demographicsEmptyTitle")}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface DoctorPerformanceCardProps {
  doctorPerformance: DoctorPerformanceEntry[];
  doctorPerformanceLoading: boolean;
  formatCurrency: (amount: number, options?: { fractionDigits?: number }) => string;
}
export function DoctorPerformanceCard({
  doctorPerformance,
  doctorPerformanceLoading,
  formatCurrency,
}: DoctorPerformanceCardProps) {
  const t = useAdvancedMetricsTranslations();
  return (
    <Card className="md:col-span-2 xl:col-span-3">
      <CardHeader>
        <CardTitle>{t("doctorPerformanceTitle")}</CardTitle>
        <CardDescription>
          {t("doctorPerformanceDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {doctorPerformanceLoading ? (
          <LoadingSpinner />
        ) : doctorPerformance.length > 0 ? (
          <div className="overflow-x-auto overscroll-x-contain rounded-md border border-border">
            <Table className="min-w-[42rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("doctorColName")}</TableHead>
                  <TableHead className="text-right">{t("doctorColAppointments")}</TableHead>
                  <TableHead className="text-right">{t("doctorColCompletion")}</TableHead>
                  <TableHead className="text-right">{t("doctorColRevenue")}</TableHead>
                  <TableHead className="text-right">{t("doctorColAvgPerAppt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorPerformance.map((doctor) => (
                  <TableRow key={doctor.doctorId}>
                    <TableCell className="font-medium">
                      {doctor.doctorName}
                    </TableCell>
                    <TableCell className="text-right">
                      {doctor.totalAppointments}
                    </TableCell>
                    <TableCell className="text-right">
                      {doctor.completionRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(doctor.revenue, { fractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(doctor.avgRevenuePerAppointment, {
                        fractionDigits: 0,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            label={t("doctorEmptyTitle")}
            sublabel={t("doctorEmptySubtitle")}
          />
        )}
      </CardContent>
    </Card>
  );
}
