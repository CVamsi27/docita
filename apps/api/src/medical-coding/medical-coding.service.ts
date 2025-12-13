import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalCodingService {
  constructor(private prisma: PrismaService) {}

  async searchIcdCodes(query: string) {
    // If query is too short, return commonly used codes
    if (!query || query.length < 2) {
      return this.prisma.icdCode.findMany({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    }

    // Handle range searches like "C00-D49" or "C00"
    const rangeMatch = query.match(/^([A-Z]\d+)(?:-([A-Z]\d+))?$/i);

    if (rangeMatch) {
      const [, start, end] = rangeMatch;

      if (end) {
        // Range search (e.g., "C00-D49")
        return this.prisma.icdCode.findMany({
          where: {
            code: {
              gte: start.toUpperCase(),
              lte: end.toUpperCase(),
            },
          },
          take: 50,
          orderBy: [
            { isCommon: 'desc' }, // Common codes first
            { code: 'asc' },
          ],
        });
      } else {
        // Single code or code prefix (e.g., "C00" finds C00, C000, C001, etc.)
        return this.prisma.icdCode.findMany({
          where: {
            code: {
              startsWith: start.toUpperCase(),
            },
          },
          take: 50,
          orderBy: [
            { isCommon: 'desc' }, // Common codes first
            { code: 'asc' },
          ],
        });
      }
    }

    // Regular text search
    return this.prisma.icdCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: [
        { isCommon: 'desc' }, // Common codes first
        { code: 'asc' },
      ],
    });
  }

  async searchCptCodes(query: string) {
    // If query is too short, return commonly used codes
    if (!query || query.length < 2) {
      return this.prisma.cptCode.findMany({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    }

    // Handle range searches like "00100-01999" or numeric codes
    const rangeMatch = query.match(/^(\d+)(?:-(\d+))?$/);

    if (rangeMatch) {
      const [, start, end] = rangeMatch;

      if (end) {
        // Range search (e.g., "00100-01999")
        return this.prisma.cptCode.findMany({
          where: {
            code: {
              gte: start.padStart(5, '0'),
              lte: end.padStart(5, '0'),
            },
          },
          take: 50,
          orderBy: [
            { isCommon: 'desc' }, // Common codes first
            { code: 'asc' },
          ],
        });
      } else {
        // Single code or code prefix (e.g., "001" finds 00100, 00101, etc.)
        const paddedCode = start.padStart(5, '0');
        return this.prisma.cptCode.findMany({
          where: {
            code: {
              startsWith: paddedCode.substring(0, start.length),
            },
          },
          take: 50,
          orderBy: [
            { isCommon: 'desc' }, // Common codes first
            { code: 'asc' },
          ],
        });
      }
    }

    // Regular text search
    return this.prisma.cptCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: [
        { isCommon: 'desc' }, // Common codes first
        { code: 'asc' },
      ],
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.doctorFavoriteCode.findMany({
      where: {
        userId,
        icdCodeId: { not: null },
      },
      include: {
        icdCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addFavorite(userId: string, icdCodeId: string) {
    return this.prisma.doctorFavoriteCode.create({
      data: {
        userId,
        icdCodeId,
      },
      include: {
        icdCode: true,
      },
    });
  }

  async removeFavorite(userId: string, icdCodeId: string) {
    return this.prisma.doctorFavoriteCode.deleteMany({
      where: {
        userId,
        icdCodeId,
      },
    });
  }

  // CPT Favorites
  async getCptFavorites(userId: string) {
    return this.prisma.doctorFavoriteCode.findMany({
      where: {
        userId,
        cptCodeId: { not: null },
      },
      include: {
        cptCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addCptFavorite(userId: string, cptCodeId: string) {
    return this.prisma.doctorFavoriteCode.create({
      data: {
        userId,
        cptCodeId,
      },
      include: {
        cptCode: true,
      },
    });
  }

  async removeCptFavorite(userId: string, cptCodeId: string) {
    return this.prisma.doctorFavoriteCode.deleteMany({
      where: {
        userId,
        cptCodeId,
      },
    });
  }

  async getUncodedVisits(clinicId: string) {
    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: 'completed',
        diagnoses: {
          none: {},
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }
}
