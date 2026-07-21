// jscpd:ignore-start
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { CalendarDays, TrendingUp, Users, type LucideIcon } from "lucide-react";
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

interface ChartCardShellProps<TData> {
  titleKey: string;
  descriptionKey: string;
  loading: boolean;
  data: TData | null | undefined;
  /** Renders the inner content given the non-null data. */
  children: (data: TData) => React.ReactNode;
  /** Empty-state label key, used when loading=false and data is missing. */
  emptyTitleKey: string;
  /** Icon for the empty state. */
  emptyIcon: LucideIcon;
}

/**
 * Shared shell for the analytics cards: title, description,
 * loading spinner, content when data exists, and an empty state
 * when it doesn't. Removes the 14-line CardContent/EmptyState
 * block jscpd was flagging between AppointmentPerformance and
 * PatientDemographics.
 */
function ChartCardShell<TData>({
  titleKey,
  descriptionKey,
  loading,
  data,
  children,
  emptyTitleKey,
  emptyIcon,
}: ChartCardShellProps<TData>) {
  const t = useAdvancedMetricsTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(titleKey)}</CardTitle>
        <CardDescription>{t(descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent className="h-80 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : data ? (
          children(data)
        ) : (
          <EmptyState icon={emptyIcon} label={t(emptyTitleKey)} />
        )}
      </CardContent>
    </Card>
  );
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
    <ChartCardShell
      titleKey="appointmentPerformanceTitle"
      descriptionKey="appointmentPerformanceDescription"
      loading={appointmentLoading}
      data={appointmentMetrics}
      emptyTitleKey="appointmentEmptyTitle"
      emptyIcon={CalendarDays}
    >
      {(metrics) => (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border p-2">
              {t("fillRateLabel", { rate: metrics.fillRate })}
            </div>
            <div className="rounded-md border p-2">
              {t("completionRateLabel", { rate: metrics.completionRate })}
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
      )}
    </ChartCardShell>
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
    <ChartCardShell
      titleKey="demographicsTitle"
      descriptionKey="demographicsDescription"
      loading={demographicsLoading}
      data={demographicsChartData.length > 0 ? patientDemographics : null}
      emptyTitleKey="demographicsEmptyTitle"
      emptyIcon={Users}
    >
      {(demographics) => (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border p-2">
              {t("demographicsTotalLabel", { count: demographics.totalPatients })}
            </div>
            <div className="rounded-md border p-2">
              {t("demographicsNewLabel", { count: demographics.newPatients })}
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
      )}
    </ChartCardShell>
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
