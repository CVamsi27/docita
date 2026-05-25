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
import {
  Bar,
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
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

interface RevenueMetricsPoint {
  date: string;
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
}

interface AppointmentMetricsData {
  total: number;
  booked: number;
  completed: number;
  cancelled: number;
  noShow: number;
  fillRate: number;
  completionRate: number;
}

interface PatientDemographicsData {
  totalPatients: number;
  newPatients: number;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
}

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
  const appointmentChartData = appointmentMetrics
    ? [
        { name: "Booked", value: appointmentMetrics.booked },
        { name: "Completed", value: appointmentMetrics.completed },
        { name: "Cancelled", value: appointmentMetrics.cancelled },
        { name: "No Show", value: appointmentMetrics.noShow },
      ]
    : [];

  const demographicsChartData = patientDemographics
    ? Object.entries(patientDemographics.genderDistribution).map(
        ([name, value]) => ({ name, value }),
      )
    : [];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>
            Daily/weekly trend in billed collections
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
              label="No revenue trend data"
              sublabel="Revenue trend points will appear once invoices are generated"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Performance</CardTitle>
          <CardDescription>
            Operational appointment outcomes snapshot
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 space-y-4">
          {appointmentLoading ? (
            <LoadingSpinner />
          ) : appointmentMetrics ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  Fill rate: {appointmentMetrics.fillRate}%
                </div>
                <div className="rounded-md border p-2">
                  Completion: {appointmentMetrics.completionRate}%
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
              label="No appointment metrics available"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient Demographics</CardTitle>
          <CardDescription>Population mix by gender and growth</CardDescription>
        </CardHeader>
        <CardContent className="h-80 space-y-4">
          {demographicsLoading ? (
            <LoadingSpinner />
          ) : patientDemographics && demographicsChartData.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  Total: {patientDemographics.totalPatients}
                </div>
                <div className="rounded-md border p-2">
                  New: {patientDemographics.newPatients}
                </div>
              </div>
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={demographicsChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
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
              label="No patient demographics available"
            />
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle>Doctor Performance</CardTitle>
          <CardDescription>
            Provider-level completion and revenue metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctorPerformanceLoading ? (
            <LoadingSpinner />
          ) : doctorPerformance.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg / Appt</TableHead>
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
              label="No doctor performance data"
              sublabel="Doctor metrics will appear once appointments are recorded and billed"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
