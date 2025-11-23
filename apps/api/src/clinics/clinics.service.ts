import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicsService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        return this.prisma.clinic.create({
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                logo: data.logo,
                tier: data.tier || 'FREE',
                settings: data.settings || {},
                active: true,
            },
        });
    }

    async findAll() {
        return this.prisma.clinic.findMany({
            where: { active: true },
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
    }

    async findOne(id: string) {
        return this.prisma.clinic.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        patients: true,
                        appointments: true,
                    },
                },
            },
        });
    }

    async update(id: string, data: any) {
        return this.prisma.clinic.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                logo: data.logo,
                tier: data.tier,
                settings: data.settings,
            },
        });
    }

    async delete(id: string) {
        // Soft delete
        return this.prisma.clinic.update({
            where: { id },
            data: { active: false },
        });
    }

    async getUserClinics(userId: string) {
        // Get clinics where user is assigned
        const doctorClinics = await this.prisma.doctorClinic.findMany({
            where: {
                doctorId: userId,
                active: true,
            },
            include: {
                clinic: true,
            },
        });

        return doctorClinics.map((dc) => dc.clinic);
    }

    async getClinicStats(clinicId: string) {
        const [patients, appointments, todayAppointments] = await Promise.all([
            this.prisma.patient.count({ where: { clinicId } }),
            this.prisma.appointment.count({ where: { clinicId } }),
            this.prisma.appointment.count({
                where: {
                    clinicId,
                    startTime: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            }),
        ]);

        return {
            totalPatients: patients,
            totalAppointments: appointments,
            todayAppointments,
        };
    }
}
