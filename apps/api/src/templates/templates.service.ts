import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.clinicalTemplate.create({
      data,
    });
  }

  findAll() {
    return this.prisma.clinicalTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.clinicalTemplate.findUnique({
      where: { id },
    });
  }

  update(id: string, data: any) {
    return this.prisma.clinicalTemplate.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.clinicalTemplate.delete({
      where: { id },
    });
  }
}
