import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrescriptionTemplatesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        return this.prisma.prescriptionTemplate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.prescriptionTemplate.findUnique({
            where: { id },
        });
    }

    async create(userId: string, data: any) {
        return this.prisma.prescriptionTemplate.create({
            data: {
                name: data.name,
                medications: data.medications,
                instructions: data.instructions,
                userId,
            },
        });
    }

    async update(id: string, data: any) {
        return this.prisma.prescriptionTemplate.update({
            where: { id },
            data: {
                name: data.name,
                medications: data.medications,
                instructions: data.instructions,
            },
        });
    }

    async remove(id: string) {
        return this.prisma.prescriptionTemplate.delete({
            where: { id },
        });
    }
}
