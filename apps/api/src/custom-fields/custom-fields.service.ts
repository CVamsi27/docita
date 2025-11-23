import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.customField.findMany({
            orderBy: { order: 'asc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.customField.findUnique({
            where: { id },
        });
    }

    async create(data: any) {
        return this.prisma.customField.create({
            data,
        });
    }

    async update(id: string, data: any) {
        return this.prisma.customField.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.customField.delete({
            where: { id },
        });
    }
}
