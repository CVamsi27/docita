import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import { PaymentGateway } from '../../gateways/payment.gateway';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private paymentGateway: PaymentGateway,
  ) {}

  async getAllClinics() {
    try {
      return await this.prisma.clinic.findMany({
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch clinics');
    }
  }

  async getClinicDoctors(clinicId: string) {
    try {
      const doctorClinics = await this.prisma.doctorClinic.findMany({
        where: { clinicId },
        include: {
          doctor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              specialization: true,
              hospitalRole: true,
              qualification: true,
              registrationNumber: true,
              licenseNumber: true,
              profilePhotoUrl: true,
              phoneNumber: true,
              bio: true,
              yearsOfExperience: true,
              consultationFee: true,
              createdAt: true,
            },
          },
        },
      });

      return doctorClinics.map((dc) => ({
        id: dc.doctor.id,
        email: dc.doctor.email,
        name: dc.doctor.name,
        role: dc.doctor.role,
        specialization: dc.doctor.specialization,
        hospitalRole: dc.doctor.hospitalRole,
        qualification: dc.doctor.qualification,
        registrationNumber: dc.doctor.registrationNumber,
        licenseNumber: dc.doctor.licenseNumber,
        profilePhotoUrl: dc.doctor.profilePhotoUrl,
        phoneNumber: dc.doctor.phoneNumber,
        bio: dc.doctor.bio,
        yearsOfExperience: dc.doctor.yearsOfExperience,
        consultationFee: dc.doctor.consultationFee,
        createdAt: dc.doctor.createdAt,
      }));
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch clinic doctors');
    }
  }

  async createClinic(data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    tier?: ClinicTier;
  }) {
    // Check if clinic or admin email already exists
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: data.email },
    });
    if (existingClinic) {
      throw new BadRequestException('Clinic email already exists');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException('Admin email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    const clinic = await this.prisma.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: data.tier || ('CAPTURE' as ClinicTier),
        users: {
          create: {
            email: data.adminEmail,
            name: data.adminName,
            password: hashedPassword,
            role: 'ADMIN',
          },
        },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return clinic;
  }

  async updateClinicTier(id: string, tier: ClinicTier) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: { tier },
    });

    // Emit real-time update to connected clients
    this.paymentGateway.emitClinicUpdate(id, {
      clinicId: id,
      tier: tier,
    });

    return clinic;
  }

  async updateClinicStatus(id: string, active: boolean) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: { active },
    });

    // Emit real-time update
    this.paymentGateway.emitClinicUpdate(id, {
      clinicId: id,
      subscriptionStatus: active ? 'active' : 'inactive',
    });

    return clinic;
  }

  async updateClinic(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      tier?: ClinicTier;
      active?: boolean;
    },
  ) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: data.tier,
        active: data.active,
      },
    });

    // Emit real-time update if tier or status changed
    if (data.tier || data.active !== undefined) {
      this.paymentGateway.emitClinicUpdate(id, {
        clinicId: id,
        tier: data.tier,
        subscriptionStatus: data.active ? 'active' : 'inactive',
      });
    }

    return clinic;
  }

  async getGlobalStats() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      // Current totals
      const [clinics, users, patients, invoices, prescriptions] =
        await Promise.all([
          this.prisma.clinic.count(),
          this.prisma.user.count(),
          this.prisma.patient.count(),
          this.prisma.invoice.count(),
          this.prisma.prescription.count(),
        ]);

      // This month's additions
      const [
        clinicsThisMonth,
        usersThisMonth,
        patientsThisMonth,
        invoicesThisMonth,
        prescriptionsThisMonth,
      ] = await Promise.all([
        this.prisma.clinic.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.patient.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.invoice.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.prescription.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
      ]);

      // Last month's totals for percentage comparison
      const [invoicesLastMonth, prescriptionsLastMonth] = await Promise.all([
        this.prisma.invoice.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),
        this.prisma.prescription.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),
      ]);

      // Calculate percentage changes
      const invoicesPercentChange =
        invoicesLastMonth > 0
          ? Math.round(
              ((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) *
                100,
            )
          : invoicesThisMonth > 0
            ? 100
            : 0;

      const prescriptionsPercentChange =
        prescriptionsLastMonth > 0
          ? Math.round(
              ((prescriptionsThisMonth - prescriptionsLastMonth) /
                prescriptionsLastMonth) *
                100,
            )
          : prescriptionsThisMonth > 0
            ? 100
            : 0;

      return {
        clinics,
        users,
        patients,
        invoices,
        prescriptions,
        trends: {
          clinicsThisMonth,
          usersThisMonth,
          patientsThisMonth,
          invoicesPercentChange,
          prescriptionsPercentChange,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch global stats');
    }
  }

  async getAnalytics(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    try {
      if (period === 'week') {
        // Get daily active users for last 7 days
        for (let i = 6; i >= 0; i--) {
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - i);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);

          labels.push(
            startDate.toLocaleDateString('en-US', { weekday: 'short' }),
          );

          // Count appointments as a proxy for active users/activity
          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          data.push(count);
        }
      } else if (period === 'month') {
        // Get daily activity for last 30 days
        for (let i = 29; i >= 0; i--) {
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - i);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);

          labels.push(startDate.getDate().toString());

          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          data.push(count);
        }
      } else {
        // Get monthly activity for last 12 months
        for (let i = 11; i >= 0; i--) {
          const startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - i);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);

          labels.push(
            startDate.toLocaleDateString('en-US', { month: 'short' }),
          );

          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          data.push(count);
        }
      }

      return {
        labels,
        datasets: [
          {
            label: 'Activity (Appointments)',
            data,
          },
        ],
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch analytics data');
    }
  }

  async getPerformanceMetrics() {
    try {
      // Get real database statistics
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Count recent activities as a proxy for request rate
      const [
        recentAppointments,
        totalAppointmentsToday,
        failedPayments,
        totalPayments,
        activeClinicCount,
        totalClinicCount,
      ] = await Promise.all([
        this.prisma.appointment.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.appointment.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.paymentSession.count({
          where: { status: 'failed', createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.paymentSession.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.clinic.count({ where: { active: true } }),
        this.prisma.clinic.count(),
      ]);

      // Calculate error rate from payment failures (as a sample metric)
      const errorRate =
        totalPayments > 0
          ? Number(((failedPayments / totalPayments) * 100).toFixed(2))
          : 0;

      // Get process memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const memoryPercent = Math.round(
        (memoryUsage.heapUsed / totalMemory) * 100,
      );

      // Get CPU usage approximation
      const cpuUsage = process.cpuUsage();
      const cpuPercent = Math.round(
        ((cpuUsage.user + cpuUsage.system) / 1000000) % 100,
      );

      // Calculate uptime
      const uptimeSeconds = process.uptime();
      const uptimePercent = uptimeSeconds > 0 ? '99.9%' : '0%'; // Simplified - if running, assume high uptime

      // Estimate requests per minute based on recent activity
      const requestsPerMinute = Math.round(recentAppointments * 10); // Rough estimate

      return {
        uptime: uptimePercent,
        responseTime: 45, // Could be measured with actual request timing middleware
        requestsPerMinute,
        errorRate,
        activeConnections: activeClinicCount,
        memoryUsage: Math.min(memoryPercent, 100),
        cpuUsage: Math.min(cpuPercent, 100),
        diskUsage: 45, // Would need fs stats for real disk usage
        healthChecks: [
          {
            name: 'API Server',
            status: 'healthy',
            value: 'Running',
            description: `Uptime: ${Math.round(uptimeSeconds / 3600)} hours`,
          },
          {
            name: 'Database',
            status: totalClinicCount > 0 ? 'healthy' : 'warning',
            value: totalClinicCount > 0 ? 'Connected' : 'No data',
            description: 'PostgreSQL primary',
          },
          {
            name: 'Active Clinics',
            status: activeClinicCount > 0 ? 'healthy' : 'warning',
            value: `${activeClinicCount} active`,
            description: `${totalClinicCount} total clinics`,
          },
          {
            name: "Today's Activity",
            status: totalAppointmentsToday > 0 ? 'healthy' : 'warning',
            value: `${totalAppointmentsToday} appointments`,
            description: 'Last 24 hours',
          },
          {
            name: 'Payment Gateway',
            status:
              errorRate < 5
                ? 'healthy'
                : errorRate < 10
                  ? 'warning'
                  : 'critical',
            value: errorRate < 5 ? 'Operational' : 'Degraded',
            description: `${errorRate}% failure rate`,
          },
          {
            name: 'Memory Usage',
            status:
              memoryPercent < 70
                ? 'healthy'
                : memoryPercent < 90
                  ? 'warning'
                  : 'critical',
            value: `${memoryPercent}%`,
            description: 'Heap memory utilization',
          },
        ],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch performance metrics',
      );
    }
  }

  async getLogs(limit: number = 50, offset: number = 0) {
    try {
      // Fetch real audit logs from the database
      try {
        const [auditLogs, total] = await Promise.all([
          this.prisma.auditLog.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
              clinic: {
                select: { name: true },
              },
            },
          }),
          this.prisma.auditLog.count(),
        ]);

        // Transform audit logs to the expected format
        const logs = auditLogs.map((log) => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          level: this.getLogLevel(log.action),
          module: log.entityType,
          message: `${log.action} on ${log.entityType}`,
          details: log.clinic?.name ? `Clinic: ${log.clinic.name}` : undefined,
        }));

        if (logs.length > 0) {
          return {
            data: logs,
            total,
          };
        }
      } catch (dbError) {
        console.warn(
          'Failed to fetch audit logs, falling back to recent activity:',
          dbError,
        );
      }

      // Fallback: Generate logs from recent database activity
      const recentActivity = await this.getRecentActivityLogs(limit, offset);
      return recentActivity;
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      throw new InternalServerErrorException('Failed to fetch logs');
    }
  }

  private getLogLevel(action: string): 'INFO' | 'WARNING' | 'ERROR' {
    if (action === 'DELETE') return 'WARNING';
    if (action === 'ERROR' || action.includes('FAIL')) return 'ERROR';
    return 'INFO';
  }

  private async getRecentActivityLogs(limit: number, offset: number) {
    // Fallback: Generate logs from recent database activity
    const [appointments, patients, invoices] = await Promise.all([
      this.prisma.appointment.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          clinic: { select: { name: true } },
        },
      }),
      this.prisma.patient.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          firstName: true,
          lastName: true,
          clinic: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          total: true,
        },
      }),
    ]);

    const logs: Array<{
      id: string;
      timestamp: string;
      level: 'INFO' | 'WARNING' | 'ERROR';
      module: string;
      message: string;
      details?: string;
    }> = [];

    appointments.forEach((apt) => {
      logs.push({
        id: `apt-${apt.id}`,
        timestamp: apt.createdAt.toISOString(),
        level: apt.status === 'cancelled' ? 'WARNING' : 'INFO',
        module: 'Appointments',
        message: `Appointment ${apt.status}`,
        details: apt.clinic?.name,
      });
    });

    patients.forEach((patient) => {
      logs.push({
        id: `patient-${patient.id}`,
        timestamp: patient.createdAt.toISOString(),
        level: 'INFO',
        module: 'Patients',
        message: `Patient registered: ${patient.firstName} ${patient.lastName}`,
        details: patient.clinic?.name,
      });
    });

    invoices.forEach((inv) => {
      logs.push({
        id: `inv-${inv.id}`,
        timestamp: inv.createdAt.toISOString(),
        level: inv.status === 'cancelled' ? 'WARNING' : 'INFO',
        module: 'Billing',
        message: `Invoice ${inv.status}: ₹${inv.total}`,
      });
    });

    // Sort by timestamp descending
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      data: logs.slice(0, limit),
      total: logs.length,
    };
  }
}
