import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorClinicsService {
    constructor(private prisma: PrismaService) { }

    async assignDoctor(doctorId: string, clinicId: string, role: string = 'doctor') {
        // Check if assignment already exists
        const existing = await this.prisma.doctorClinic.findUnique({
            where: {
                doctorId_clinicId: {
                    doctorId,
                    clinicId,
                },
            },
        });

        if (existing) {
            // Reactivate if inactive
            return this.prisma.doctorClinic.update({
                where: { id: existing.id },
                data: { active: true, role },
            });
        }

        return this.prisma.doctorClinic.create({
            data: {
                doctorId,
                clinicId,
                role,
                active: true,
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                clinic: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async removeDoctor(doctorId: string, clinicId: string) {
        const assignment = await this.prisma.doctorClinic.findUnique({
            where: {
                doctorId_clinicId: {
                    doctorId,
                    clinicId,
                },
            },
        });

        if (!assignment) {
            throw new Error('Assignment not found');
        }

        // Soft delete
        return this.prisma.doctorClinic.update({
            where: { id: assignment.id },
            data: { active: false },
        });
    }

    async getDoctorClinics(doctorId: string) {
        return this.prisma.doctorClinic.findMany({
            where: {
                doctorId,
                active: true,
            },
            include: {
                clinic: true,
            },
        });
    }

    async getClinicDoctors(clinicId: string) {
        return this.prisma.doctorClinic.findMany({
            where: {
                clinicId,
                active: true,
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    async updateRole(doctorId: string, clinicId: string, role: string) {
        const assignment = await this.prisma.doctorClinic.findUnique({
            where: {
                doctorId_clinicId: {
                    doctorId,
                    clinicId,
                },
            },
        });

        if (!assignment) {
            throw new Error('Assignment not found');
        }

        return this.prisma.doctorClinic.update({
            where: { id: assignment.id },
            data: { role },
        });
    }
}
