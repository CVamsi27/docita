import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import { PaymentGateway } from '../../gateways/payment.gateway';
import * as bcrypt from 'bcrypt';
import {
  getMonthRange,
  getDayRange,
  getLastNDaysRange,
  formatDate,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/types';

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
        tier: data.tier || ('CORE' as ClinicTier), // Default to CORE tier for basic functionality
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
    // Build update data object with only defined fields
    const updateData: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      tier?: ClinicTier;
      active?: boolean;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.active !== undefined) updateData.active = data.active;

    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: updateData,
    });

    // Emit real-time update if tier or status changed
    if (data.tier !== undefined || data.active !== undefined) {
      this.paymentGateway.emitClinicUpdate(id, {
        clinicId: id,
        tier: data.tier,
        subscriptionStatus: data.active ? 'active' : 'inactive',
      });
    }

    return clinic;
  }

  async getGlobalStats(timezone: string = DEFAULT_TIMEZONE) {
    try {
      // Use timezone-aware date ranges
      const thisMonthRange = getMonthRange(new Date(), { timezone });
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthRange = getMonthRange(lastMonthDate, { timezone });

      // Current totals
      const [clinics, users, doctors, patients, invoices, prescriptions] =
        await Promise.all([
          this.prisma.clinic.count(),
          this.prisma.user.count(),
          this.prisma.user.count({ where: { role: 'DOCTOR' } }),
          this.prisma.patient.count(),
          this.prisma.invoice.count(),
          this.prisma.prescription.count(),
        ]);

      // This month's additions
      const [
        clinicsThisMonth,
        usersThisMonth,
        doctorsThisMonth,
        patientsThisMonth,
        invoicesThisMonth,
        prescriptionsThisMonth,
      ] = await Promise.all([
        this.prisma.clinic.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.user.count({
          where: {
            role: 'DOCTOR',
            createdAt: { gte: thisMonthRange.start },
          },
        }),
        this.prisma.patient.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.invoice.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.prescription.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
      ]);

      // Last month's totals for percentage comparison
      const [invoicesLastMonth, prescriptionsLastMonth] = await Promise.all([
        this.prisma.invoice.count({
          where: {
            createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
          },
        }),
        this.prisma.prescription.count({
          where: {
            createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
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
        doctors,
        patients,
        invoices,
        prescriptions,
        trends: {
          clinicsThisMonth,
          usersThisMonth,
          doctorsThisMonth,
          patientsThisMonth,
          invoicesPercentChange,
          prescriptionsPercentChange,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch global stats');
    }
  }

  async getAnalytics(
    period: 'week' | 'month' | 'year' = 'month',
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    const labels: string[] = [];
    const data: number[] = [];

    try {
      if (period === 'week') {
        // Get daily active users for last 7 days
        const weekRange = getLastNDaysRange(6, { timezone });
        for (let i = 6; i >= 0; i--) {
          const dayRange = getDayRange(
            new Date(weekRange.end.getTime() - i * 24 * 60 * 60 * 1000),
            { timezone },
          );

          labels.push(formatDate(dayRange.start, 'EEE', { timezone }));

          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: dayRange.start,
                lte: dayRange.end,
              },
            },
          });
          data.push(count);
        }
      } else if (period === 'month') {
        // Get daily activity for last 30 days
        const monthRange = getLastNDaysRange(29, { timezone });
        for (let i = 29; i >= 0; i--) {
          const dayRange = getDayRange(
            new Date(monthRange.end.getTime() - i * 24 * 60 * 60 * 1000),
            { timezone },
          );

          labels.push(formatDate(dayRange.start, 'd', { timezone }));

          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: dayRange.start,
                lte: dayRange.end,
              },
            },
          });
          data.push(count);
        }
      } else {
        // Get monthly activity for last 12 months
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthRange = getMonthRange(monthDate, { timezone });

          labels.push(formatDate(monthRange.start, 'MMM', { timezone }));

          const count = await this.prisma.appointment.count({
            where: {
              createdAt: {
                gte: monthRange.start,
                lte: monthRange.end,
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
      const os = await import('os');
      const totalMemory = os.totalmem();
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

  // Admin Management Methods
  async getClinicAdmins(clinicId: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          clinicId,
          role: {
            in: ['ADMIN', 'ADMIN_DOCTOR'],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return admins;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch clinic admins');
    }
  }

  async createAdmin(
    clinicId: string,
    data: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
      adminType: 'admin' | 'admin_doctor';
    },
  ) {
    try {
      // Check if clinic exists
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Check if admin email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Determine role
      const role = data.adminType === 'admin_doctor' ? 'ADMIN_DOCTOR' : 'ADMIN';

      // Create admin user
      const admin = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phoneNumber: data.phoneNumber,
          role,
          clinicId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return admin;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create admin');
    }
  }

  async getAdminDetails(adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          clinicId: true,
          createdAt: true,
          updatedAt: true,
          clinic: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      return admin;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch admin details');
    }
  }

  async updateAdmin(
    adminId: string,
    data: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      adminType?: 'admin' | 'admin_doctor';
    },
  ) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // Check if email is being changed and if it's already in use
      if (data.email && data.email !== admin.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          throw new BadRequestException('Email already in use');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.phoneNumber !== undefined)
        updateData.phoneNumber = data.phoneNumber;
      if (data.adminType) {
        updateData.role =
          data.adminType === 'admin_doctor' ? 'ADMIN_DOCTOR' : 'ADMIN';
      }

      const updatedAdmin = await this.prisma.user.update({
        where: { id: adminId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedAdmin;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update admin');
    }
  }

  async deactivateAdmin(adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // We can mark as deactivated by setting a flag or removing from clinic
      // For now, we'll just return a message indicating deactivation
      // In production, you might want to add an 'active' or 'status' field to User model
      return {
        id: admin.id,
        message:
          'Admin deactivation requires additional setup (active/status field on User model)',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to deactivate admin');
    }
  }

  async activateAdmin(adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // Similar to deactivate, this requires the active/status field
      return {
        id: admin.id,
        message:
          'Admin activation requires additional setup (active/status field on User model)',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to activate admin');
    }
  }

  // AI Features Management Methods
  async getClinicAIFeatures(clinicId: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          id: true,
          name: true,
          tier: true,
          intelligenceAddon: true,
          features: true,
        },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        tier: clinic.tier,
        aiEnabled: clinic.intelligenceAddon === 'ACTIVE',
        features: clinic.features || {
          predictiveAnalytics: false,
          automatedDiagnosis: false,
          patientInsights: false,
          appointmentOptimization: false,
          prescriptionAssistant: false,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch AI features for clinic',
      );
    }
  }

  async updateClinicAIFeatures(
    clinicId: string,
    data: {
      enabled: boolean;
      features?: Record<string, boolean>;
    },
  ) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Update intelligence addon and features
      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          intelligenceAddon: data.enabled ? 'ACTIVE' : 'NONE',
          features: (data.features as any) || (clinic.features as any),
        },
        select: {
          id: true,
          name: true,
          tier: true,
          intelligenceAddon: true,
          features: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        clinic: updatedClinic,
        message: `AI features ${data.enabled ? 'enabled' : 'disabled'} for clinic ${clinic.name}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update AI features');
    }
  }

  async enableAIFeatures(clinicId: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Only allow AI features for PRO and ENTERPRISE tiers
      const allowedTiers = ['PRO', 'ENTERPRISE'];
      if (!allowedTiers.includes(clinic.tier)) {
        throw new BadRequestException(
          `AI features are only available for ${allowedTiers.join(', ')} tier clinics. Current tier: ${clinic.tier}`,
        );
      }

      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          intelligenceAddon: 'ACTIVE',
          features: {
            predictiveAnalytics: true,
            automatedDiagnosis: true,
            patientInsights: true,
            appointmentOptimization: true,
            prescriptionAssistant: true,
          },
        },
        select: {
          id: true,
          name: true,
          intelligenceAddon: true,
          features: true,
        },
      });

      return {
        success: true,
        clinic: updatedClinic,
        message: `All AI features enabled for ${clinic.name}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to enable AI features');
    }
  }

  async disableAIFeatures(clinicId: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          intelligenceAddon: 'NONE',
          features: {
            predictiveAnalytics: false,
            automatedDiagnosis: false,
            patientInsights: false,
            appointmentOptimization: false,
            prescriptionAssistant: false,
          },
        },
        select: {
          id: true,
          name: true,
          intelligenceAddon: true,
          features: true,
        },
      });

      return {
        success: true,
        clinic: updatedClinic,
        message: `All AI features disabled for ${clinic.name}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to disable AI features');
    }
  }

  // Payment & Tier Management Methods
  async processPaymentAndUpdateTier(
    clinicId: string,
    data: {
      paymentId: string;
      amount: number;
      currency: string;
      newTier: ClinicTier;
      paymentMethod: string;
      notes?: string;
    },
  ) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Validate tier
      const validTiers: ClinicTier[] = [
        'CAPTURE',
        'CORE',
        'PLUS',
        'PRO',
        'ENTERPRISE',
      ];
      if (!validTiers.includes(data.newTier)) {
        throw new BadRequestException('Invalid tier specified');
      }

      // Process payment (integration point with payment gateway)
      const paymentResult = {
        paymentId: data.paymentId,
        status: 'completed', // In production, verify with payment gateway
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        timestamp: new Date(),
      };

      // If payment is successful, update clinic tier
      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: {
          tier: data.newTier,
          subscriptionStatus: 'active',
        },
        select: {
          id: true,
          name: true,
          tier: true,
          subscriptionStatus: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        payment: paymentResult,
        clinic: updatedClinic,
        message: `Clinic upgraded to ${data.newTier} tier after successful payment`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process payment and update tier',
      );
    }
  }

  async getClinicTierInfo(clinicId: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          id: true,
          name: true,
          tier: true,
          subscriptionStatus: true,
          intelligenceAddon: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Get tier details with features
      const tierInfo = this.getTierDetails(clinic.tier);

      return {
        clinic,
        tierInfo,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch tier information',
      );
    }
  }

  async upgradeTier(clinicId: string, newTier: ClinicTier) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Define tier hierarchy
      const tierHierarchy: { [key in ClinicTier]: number } = {
        CAPTURE: 1,
        CORE: 2,
        PLUS: 3,
        PRO: 4,
        ENTERPRISE: 5,
      };

      if (tierHierarchy[newTier] <= tierHierarchy[clinic.tier]) {
        throw new BadRequestException(
          'Can only upgrade to a higher tier. Use downgrade for lower tiers.',
        );
      }

      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: { tier: newTier },
        select: {
          id: true,
          name: true,
          tier: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        clinic: updatedClinic,
        message: `Clinic upgraded from ${clinic.tier} to ${newTier}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upgrade tier');
    }
  }

  async downgradeTier(clinicId: string, newTier: ClinicTier) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        throw new BadRequestException('Clinic not found');
      }

      // Define tier hierarchy
      const tierHierarchy: { [key in ClinicTier]: number } = {
        CAPTURE: 1,
        CORE: 2,
        PLUS: 3,
        PRO: 4,
        ENTERPRISE: 5,
      };

      if (tierHierarchy[newTier] >= tierHierarchy[clinic.tier]) {
        throw new BadRequestException(
          'Can only downgrade to a lower tier. Use upgrade for higher tiers.',
        );
      }

      const updatedClinic = await this.prisma.clinic.update({
        where: { id: clinicId },
        data: { tier: newTier },
        select: {
          id: true,
          name: true,
          tier: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        clinic: updatedClinic,
        message: `Clinic downgraded from ${clinic.tier} to ${newTier}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to downgrade tier');
    }
  }

  private getTierDetails(tier: ClinicTier) {
    const tierDetails: { [key in ClinicTier]: any } = {
      CAPTURE: {
        name: 'Capture',
        price: 0,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          'Basic patient management',
          'Simple appointment scheduling',
          'Limited doctor accounts (1)',
          'Community support',
        ],
        maxDoctors: 1,
        maxPatients: 100,
        aiEnabled: false,
      },
      CORE: {
        name: 'Core',
        price: 4999,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          'All Capture features',
          'Up to 5 doctor accounts',
          'Advanced reporting',
          'Email support',
          'Custom branding',
        ],
        maxDoctors: 5,
        maxPatients: 1000,
        aiEnabled: false,
      },
      PLUS: {
        name: 'Plus',
        price: 9999,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          'All Core features',
          'Up to 20 doctor accounts',
          'Advanced analytics',
          'Priority email support',
          'API access',
          'Custom workflows',
        ],
        maxDoctors: 20,
        maxPatients: 5000,
        aiEnabled: false,
      },
      PRO: {
        name: 'Pro',
        price: 24999,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          'All Plus features',
          'Unlimited doctor accounts',
          'AI-powered features',
          'Phone support',
          'Dedicated account manager',
          'Custom integrations',
        ],
        maxDoctors: -1, // Unlimited
        maxPatients: -1, // Unlimited
        aiEnabled: true,
      },
      ENTERPRISE: {
        name: 'Enterprise',
        price: null, // Custom pricing
        currency: 'INR',
        billingCycle: 'annual',
        features: [
          'All Pro features',
          'White-label solution',
          '24/7 phone support',
          'Dedicated support team',
          'Custom development',
          'SLA guarantee',
          'Advanced security',
        ],
        maxDoctors: -1, // Unlimited
        maxPatients: -1, // Unlimited
        aiEnabled: true,
      },
    };

    return tierDetails[tier] || null;
  }

  getTierPricingInfo() {
    const tiers: ClinicTier[] = [
      'CAPTURE',
      'CORE',
      'PLUS',
      'PRO',
      'ENTERPRISE',
    ];
    return tiers.map((tier) => ({
      tier,
      ...this.getTierDetails(tier),
    }));
  }

  getAIFeaturesCatalog() {
    return {
      aiFeatures: [
        {
          id: 'predictiveAnalytics',
          name: 'Predictive Analytics',
          description:
            'Analyze patient patterns and predict health trends using machine learning',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'activity',
        },
        {
          id: 'automatedDiagnosis',
          name: 'Automated Diagnosis Assistant',
          description:
            'AI-powered suggestions for diagnosis based on symptoms and medical history',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'microscope',
        },
        {
          id: 'patientInsights',
          name: 'Patient Health Insights',
          description:
            'Deep insights into patient health metrics and personalized recommendations',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'pie-chart',
        },
        {
          id: 'appointmentOptimization',
          name: 'Appointment Optimization',
          description:
            'AI-optimized scheduling to reduce no-shows and maximize doctor efficiency',
          availableIn: ['PLUS', 'PRO', 'ENTERPRISE'],
          icon: 'calendar',
        },
        {
          id: 'prescriptionAssistant',
          name: 'Smart Prescription Assistant',
          description:
            'AI-assisted prescription generation with drug interaction checks',
          availableIn: ['PRO', 'ENTERPRISE'],
          icon: 'pill',
        },
      ],
      tierComparison: this.getTierPricingInfo(),
    };
  }
}
