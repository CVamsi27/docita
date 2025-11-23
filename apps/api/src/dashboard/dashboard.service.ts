import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            totalPatients,
            todayAppointments,
            totalAppointments,
            activePrescriptions,
            recentActivity
        ] = await Promise.all([
            this.prisma.patient.count(),
            this.prisma.appointment.count({
                where: {
                    startTime: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
            }),
            this.prisma.appointment.count(),
            this.prisma.prescription.count(), // Approximation for active prescriptions
            this.prisma.appointment.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: true,
                },
            }),
        ]);

        // Get upcoming appointments for the card
        const upcomingAppointments = await this.prisma.appointment.findMany({
            where: {
                startTime: {
                    gte: today,
                },
                status: {
                    in: ['scheduled', 'confirmed'],
                }
            },
            take: 4,
            orderBy: { startTime: 'asc' },
            include: {
                patient: true,
            },
        });

        return {
            stats: {
                totalPatients,
                todayAppointments,
                activePrescriptions,
                pendingReports: 0, // Placeholder
            },
            upcomingAppointments: upcomingAppointments.map(apt => ({
                id: apt.id,
                time: new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                patient: `${apt.patient.firstName} ${apt.patient.lastName}`,
                type: apt.type,
                status: apt.status,
            })),
            recentActivity: recentActivity.map(apt => ({
                id: apt.id,
                patient: `${apt.patient.firstName} ${apt.patient.lastName}`,
                action: `Appointment ${apt.status}`,
                time: this.formatTimeAgo(apt.createdAt),
                initials: `${apt.patient.firstName[0]}${apt.patient.lastName[0]}`,
                className: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" // Dynamic classes could be added
            }))
        };
    }

    private formatTimeAgo(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
}
