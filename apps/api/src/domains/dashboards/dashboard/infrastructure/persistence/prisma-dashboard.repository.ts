import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentStatus,
  InvoiceStatus,
  LabTestOrderStatus,
  Prisma,
} from '@workspace/db';
import {
  DashboardStatsSnapshot,
  IDashboardRepository,
} from '@/domains/dashboards/dashboard/core/repositories/dashboard.repository.interface';

// Shared by both appointment selects below — the dashboard only ever needs
// the patient's display name alongside their id, so keep the projection in
// one place rather than repeating the nested `select` shape.
const PATIENT_SUMMARY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.PatientSelect;

const RECENT_ACTIVITY_SELECT = {
  id: true,
  startTime: true,
  status: true,
  type: true,
  createdAt: true,
  patient: {
    select: PATIENT_SUMMARY_SELECT,
  },
} satisfies Prisma.AppointmentSelect;

const UPCOMING_APPOINTMENT_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  patient: {
    select: PATIENT_SUMMARY_SELECT,
  },
} satisfies Prisma.AppointmentSelect;

@Injectable()
export class PrismaDashboardRepository implements IDashboardRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async getStatsSnapshot(clinicId: string): Promise<DashboardStatsSnapshot> {
    const readClient = this.getReadClient();
    const now = this.clock.now();

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const clinicFilter = { clinicId };

    const [
      totalPatients,
      totalDoctors,
      newPatientsThisMonth,
      todayAppointments,
      totalAppointments,
      activePrescriptions,
      recentActivity,
      upcomingAppointments,
      pendingReports,
      monthlyRevenueResult,
    ] = await Promise.all([
      readClient.patient.count({ where: clinicFilter }),
      readClient.user.count({
        where: {
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
      }),
      readClient.patient.count({
        where: {
          ...clinicFilter,
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      readClient.appointment.count({
        where: {
          ...clinicFilter,
          startTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      readClient.appointment.count({ where: clinicFilter }),
      readClient.prescription.count({
        where: { appointment: { clinicId } },
      }),
      readClient.appointment.findMany({
        where: clinicFilter,
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: RECENT_ACTIVITY_SELECT,
      }),
      readClient.appointment.findMany({
        where: {
          ...clinicFilter,
          startTime: {
            gte: today,
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
        take: 4,
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        select: UPCOMING_APPOINTMENT_SELECT,
      }),
      readClient.labTestOrder.count({
        where: {
          clinicId,
          status: {
            in: [LabTestOrderStatus.ORDERED, LabTestOrderStatus.PENDING],
          },
        },
      }),
      readClient.invoice.aggregate({
        where: {
          appointment: { clinicId },
          status: InvoiceStatus.PAID,
          updatedAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalPatients,
      totalDoctors,
      newPatientsThisMonth,
      todayAppointments,
      totalAppointments,
      activePrescriptions,
      recentActivity,
      upcomingAppointments,
      pendingReports,
      monthlyRevenue: monthlyRevenueResult._sum.total ?? 0,
    };
  }
}
