import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalCodingService {
  constructor(private prisma: PrismaService) {}

  async searchIcdCodes(query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.prisma.icdCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: {
        code: 'asc',
      },
    });
  }

  async searchCptCodes(query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.prisma.cptCode.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: {
        code: 'asc',
      },
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
