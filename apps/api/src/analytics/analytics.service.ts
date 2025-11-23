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
        const revenueThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + (inv.total || 0), 0);

        // Revenue last month
        const invoicesLastMonth = await this.prisma.invoice.findMany({
            where: {
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
            },
            select: { total: true },
        });
        const revenueLastMonth = invoicesLastMonth.reduce((sum, inv) => sum + (inv.total || 0), 0);

        // Calculate growth percentages
        const patientGrowth = newPatientsLastMonth > 0
            ? ((newPatientsThisMonth - newPatientsLastMonth) / newPatientsLastMonth) * 100
            : 0;

        const revenueGrowth = revenueLastMonth > 0
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

    async getRevenueTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
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
        const byStatus = appointments.reduce((acc, apt) => {
            acc[apt.status] = (acc[apt.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Group by type
        const byType = appointments.reduce((acc, apt) => {
            acc[apt.type] = (acc[apt.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

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
                    if (word.length > 4) { // Filter short words
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
}
