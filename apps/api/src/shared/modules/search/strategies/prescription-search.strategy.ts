import { getPatientFullName } from '@workspace/utils';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { SearchResult } from '../search.types';
import type { ISearchStrategy } from './search-strategy.interface';

@Injectable()
export class PrescriptionSearchStrategy implements ISearchStrategy {
  readonly entityType = 'prescription' as const;

  constructor(private readonly prisma: PrismaService) {}

  async search(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patient: { clinicId },
        OR: [
          { instructions: { contains: query, mode: 'insensitive' } },
          { patient: { firstName: { contains: query, mode: 'insensitive' } } },
          { patient: { lastName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        instructions: true,
        createdAt: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return prescriptions.map((prescription) => ({
      id: prescription.id,
      type: 'prescription' as const,
      title: getPatientFullName(prescription.patient),
      subtitle: prescription.instructions || 'Prescription',
      meta: { createdAt: prescription.createdAt },
    }));
  }
}
