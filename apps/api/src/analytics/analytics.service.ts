import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total patients
    const totalPatients = await this.prisma.patient.count();

    // New patients this month
    const newPatientsThisMonth = await this.prisma.patient.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // New patients last month
    const newPatientsLastMonth = await this.prisma.patient.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // Total appointments
    const totalAppointments = await this.prisma.appointment.count();

    // Appointments this month
    const appointmentsThisMonth = await this.prisma.appointment.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Revenue this month
    const invoicesThisMonth = await this.prisma.invoice.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: { total: true },
    });
    const revenueThisMonth = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0,
    );

    // Revenue last month
    const invoicesLastMonth = await this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      select: { total: true },
    });
    const revenueLastMonth = invoicesLastMonth.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0,
    );

    // Calculate growth percentages
    const patientGrowth =
      newPatientsLastMonth > 0
        ? ((newPatientsThisMonth - newPatientsLastMonth) /
          newPatientsLastMonth) *
        100
        : 0;

    const revenueGrowth =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

    return {
      totalPatients,
      newPatientsThisMonth,
      patientGrowth: Math.round(patientGrowth * 10) / 10,
      totalAppointments,
      appointmentsThisMonth,
      revenueThisMonth,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    };
  }

  async getRevenueTrends(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30,
  ) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const revenueByDate = new Map<string, number>();

    invoices.forEach((invoice) => {
      const dateKey = invoice.createdAt.toISOString().split('T')[0];
      const current = revenueByDate.get(dateKey) || 0;
      revenueByDate.set(dateKey, current + (invoice.total || 0));
    });

    // Convert to array format
    const data = Array.from(revenueByDate.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    return data;
  }

  async getPatientGrowth(days: number = 30) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const patients = await this.prisma.patient.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const patientsByDate = new Map<string, number>();

    patients.forEach((patient) => {
      const dateKey = patient.createdAt.toISOString().split('T')[0];
      const current = patientsByDate.get(dateKey) || 0;
      patientsByDate.set(dateKey, current + 1);
    });

    // Convert to cumulative count
    let cumulative = 0;
    const data = Array.from(patientsByDate.entries()).map(([date, count]) => {
      cumulative += count;
      return { date, count: cumulative };
    });

    return data;
  }

  async getAppointmentStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const appointments = await this.prisma.appointment.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: {
        status: true,
        type: true,
      },
    });

    // Group by status
    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by type
    const byType = appointments.reduce(
      (acc, apt) => {
        acc[apt.type] = (acc[apt.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: appointments.length,
      byStatus,
      byType,
    };
  }

  async getTopDiagnoses(limit: number = 10) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        observations: { not: null },
      },
      select: {
        observations: true,
      },
      take: 1000, // Limit for performance
    });

    // This is a simplified version - in production, you'd want better text analysis
    const diagnosisCount = new Map<string, number>();

    appointments.forEach((apt) => {
      if (apt.observations) {
        // Simple word extraction (you might want to use NLP here)
        const words = apt.observations.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 4) {
            // Filter short words
            const current = diagnosisCount.get(word) || 0;
            diagnosisCount.set(word, current + 1);
          }
        });
      }
    });

    // Sort and get top N
    const sorted = Array.from(diagnosisCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([diagnosis, count]) => ({ diagnosis, count }));

    return sorted;
  }

  // ============================================================================
  // Disease Trends by ICD Code
  // ============================================================================

  async getDiseaseTrends(clinicId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      appointment: { clinicId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const diagnoses = await this.prisma.diagnosis.groupBy({
      by: ['icdCodeId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    // Fetch ICD code details
    const icdCodeIds = diagnoses.map((d) => d.icdCodeId).filter(Boolean);
    const icdCodes = await this.prisma.icdCode.findMany({
      where: { id: { in: icdCodeIds as string[] } },
    });

    const icdCodeMap = new Map(icdCodes.map((code) => [code.id, code]));

    return diagnoses.map((d) => ({
      icdCode: icdCodeMap.get(d.icdCodeId as string),
      count: d._count.id,
    }));
  }

  async getDiseaseTrendsByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const trends = await this.getDiseaseTrends(clinicId, startDate, endDate);

    // Group by category
    const byCategory = trends.reduce(
      (acc, item) => {
        if (item.icdCode) {
          const category = item.icdCode.category;
          acc[category] = (acc[category] || 0) + item.count;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getDiseaseTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: {
        appointment: { clinicId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        icdCode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time period
    const timeSeriesData = new Map<string, Map<string, number>>();

    diagnoses.forEach((diagnosis) => {
      if (!diagnosis.icdCode) return;

      const date = new Date(diagnosis.createdAt);
      let periodKey: string;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeSeriesData.has(periodKey)) {
        timeSeriesData.set(periodKey, new Map());
      }

      const periodData = timeSeriesData.get(periodKey)!;
      const codeKey = diagnosis.icdCode.code;
      periodData.set(codeKey, (periodData.get(codeKey) || 0) + 1);
    });

    return Array.from(timeSeriesData.entries()).map(([period, codes]) => ({
      period,
      diagnoses: Array.from(codes.entries()).map(([code, count]) => ({
        code,
        count,
      })),
    }));
  }

  // ============================================================================
  // Revenue by CPT Code
  // ============================================================================

  async getRevenueByCptCode(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      appointment: { clinicId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const procedures = await this.prisma.procedure.groupBy({
      by: ['cptCodeId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    // Fetch CPT code details with prices
    const cptCodeIds = procedures.map((p) => p.cptCodeId).filter(Boolean);
    const cptCodes = await this.prisma.cptCode.findMany({
      where: { id: { in: cptCodeIds as string[] } },
    });

    const cptCodeMap = new Map(cptCodes.map((code) => [code.id, code]));

    return procedures.map((p) => {
      const cptCode = cptCodeMap.get(p.cptCodeId as string);
      const count = p._count.id;
      const totalRevenue = cptCode ? cptCode.price * count : 0;

      return {
        cptCode,
        procedureCount: count,
        totalRevenue,
        avgPrice: cptCode?.price || 0,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getRevenueByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const revenueData = await this.getRevenueByCptCode(
      clinicId,
      startDate,
      endDate,
    );

    // Group by category
    const byCategory = revenueData.reduce(
      (acc, item) => {
        if (item.cptCode) {
          const category = item.cptCode.category;
          if (!acc[category]) {
            acc[category] = { count: 0, revenue: 0 };
          }
          acc[category].count += item.procedureCount;
          acc[category].revenue += item.totalRevenue;
        }
        return acc;
      },
      {} as Record<string, { count: number; revenue: number }>,
    );

    return Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getRevenueTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    const procedures = await this.prisma.procedure.findMany({
      where: {
        appointment: { clinicId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        cptCode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time period
    const timeSeriesData = new Map<string, number>();

    procedures.forEach((procedure) => {
      if (!procedure.cptCode) return;

      const date = new Date(procedure.createdAt);
      let periodKey: string;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const revenue = procedure.cptCode.price;
      timeSeriesData.set(periodKey, (timeSeriesData.get(periodKey) || 0) + revenue);
    });

    return Array.from(timeSeriesData.entries())
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  // ============================================================================
  // Coding Compliance Metrics
  // ============================================================================

  async getCodingComplianceMetrics(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      clinicId,
      status: 'completed',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        diagnoses: {
          include: {
            icdCode: true,
          },
        },
        procedures: {
          include: {
            cptCode: true,
          },
        },
      },
    });

    const totalVisits = appointments.length;
    const codedVisits = appointments.filter((a) => a.diagnoses.length > 0).length;
    const billedVisits = appointments.filter((a) => a.procedures.length > 0).length;
    const primaryDiagnosisCount = appointments.filter((a) =>
      a.diagnoses.some((d) => d.isPrimary),
    ).length;

    const totalDiagnoses = appointments.reduce(
      (sum, a) => sum + a.diagnoses.length,
      0,
    );
    const totalProcedures = appointments.reduce(
      (sum, a) => sum + a.procedures.length,
      0,
    );

    const proceduresWithoutPrice = appointments.reduce((sum, a) => {
      return (
        sum +
        a.procedures.filter((p) => !p.cptCode || p.cptCode.price === 0).length
      );
    }, 0);

    return {
      totalVisits,
      codedVisits,
      billedVisits,
      codingCompletenessRate:
        totalVisits > 0 ? (codedVisits / totalVisits) * 100 : 0,
      billingRate: totalVisits > 0 ? (billedVisits / totalVisits) * 100 : 0,
      primaryDiagnosisRate:
        codedVisits > 0 ? (primaryDiagnosisCount / codedVisits) * 100 : 0,
      avgDiagnosesPerVisit: totalVisits > 0 ? totalDiagnoses / totalVisits : 0,
      avgProceduresPerVisit: totalVisits > 0 ? totalProcedures / totalVisits : 0,
      proceduresWithoutPrice,
      unbilledProceduresRate:
        totalProcedures > 0 ? (proceduresWithoutPrice / totalProcedures) * 100 : 0,
    };
  }

  async getUncodedVisitsStats(clinicId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const uncodedVisits = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: 'completed',
        diagnoses: {
          none: {},
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const oldUncoded = uncodedVisits.filter(
      (v) => v.createdAt < sevenDaysAgo,
    ).length;

    return {
      totalUncoded: uncodedVisits.length,
      uncodedOlderThan7Days: oldUncoded,
      recentUncoded: uncodedVisits.length - oldUncoded,
    };
  }

  async getCodingTimeliness(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      clinicId,
      status: 'completed',
      diagnoses: {
        some: {},
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        diagnoses: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const timeToCodeData = appointments
      .filter((a) => a.diagnoses.length > 0)
      .map((a) => {
        const appointmentDate = new Date(a.createdAt);
        const firstDiagnosisDate = new Date(a.diagnoses[0].createdAt);
        const hoursToCode =
          (firstDiagnosisDate.getTime() - appointmentDate.getTime()) /
          (1000 * 60 * 60);
        return hoursToCode;
      });

    const avgTimeToCode =
      timeToCodeData.length > 0
        ? timeToCodeData.reduce((sum, t) => sum + t, 0) / timeToCodeData.length
        : 0;

    // Distribution buckets: <24h, 24-48h, 48-72h, >72h
    const distribution = {
      within24h: timeToCodeData.filter((t) => t < 24).length,
      within48h: timeToCodeData.filter((t) => t >= 24 && t < 48).length,
      within72h: timeToCodeData.filter((t) => t >= 48 && t < 72).length,
      over72h: timeToCodeData.filter((t) => t >= 72).length,
    };

    return {
      avgTimeToCodeHours: avgTimeToCode,
      distribution,
      totalCoded: timeToCodeData.length,
    };
  }
}
