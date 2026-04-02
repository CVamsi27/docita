import { Injectable } from '@nestjs/common';
import { SignaturePurpose } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ISignatureUploadRepository,
  UploadTokenWithRelations,
  ActiveTokenSummary,
} from '@/domains/doctors/core/repositories/signature-upload.repository.interface';

const ACTIVE_TOKEN_SELECT = {
  id: true,
  token: true,
  expiresAt: true,
  createdAt: true,
  purpose: true,
} as const;

@Injectable()
export class PrismaSignatureUploadRepository implements ISignatureUploadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
  }

  async findClinicById(clinicId: string) {
    return this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true },
    });
  }

  async createUploadToken(data: {
    doctorId: string;
    clinicId?: string;
    token: string;
    expiresAt: Date;
    purpose: SignaturePurpose;
  }) {
    return this.prisma.signatureUploadToken.create({ data: data as never });
  }

  async findTokenByValue(
    token: string,
  ): Promise<UploadTokenWithRelations | null> {
    return this.prisma.runUnrestricted(async () => {
      return this.prisma.signatureUploadToken.findUnique({
        where: { token },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              signatureUrl: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
              slaSignatureUrl: true,
            },
          },
        },
      }) as Promise<UploadTokenWithRelations | null>;
    });
  }

  async findTokenById(id: string, doctorId: string) {
    return this.prisma.signatureUploadToken.findFirst({
      where: { id, doctorId },
    });
  }

  async findClinicTokenById(id: string, clinicId: string) {
    return this.prisma.signatureUploadToken.findFirst({
      where: { id, clinicId },
    });
  }

  async findActiveTokensByDoctor(
    doctorId: string,
  ): Promise<ActiveTokenSummary[]> {
    return this.prisma.signatureUploadToken.findMany({
      where: {
        doctorId,
        purpose: SignaturePurpose.DOCTOR_PRESCRIPTION,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: ACTIVE_TOKEN_SELECT,
    });
  }

  async findActiveTokensByClinic(
    clinicId: string,
  ): Promise<ActiveTokenSummary[]> {
    return this.prisma.signatureUploadToken.findMany({
      where: {
        clinicId,
        purpose: SignaturePurpose.SLA_ACCEPTANCE,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: ACTIVE_TOKEN_SELECT,
    });
  }

  async markTokenUsed(token: string): Promise<void> {
    await this.prisma.signatureUploadToken.update({
      where: { token },
      data: { used: true, usedAt: new Date() },
    });
  }

  async markTokenUsedById(id: string): Promise<void> {
    await this.prisma.signatureUploadToken.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
  }

  async updateDoctorSignature(
    doctorId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void> {
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: doctorId },
          data: { signatureUrl, signatureUploadedAt: new Date() },
        }),
        this.prisma.signatureUploadToken.update({
          where: { token },
          data: { used: true, usedAt: new Date() },
        }),
      ]);
    });
  }

  async updateClinicSignature(
    clinicId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void> {
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.$transaction([
        this.prisma.clinic.update({
          where: { id: clinicId },
          data: {
            slaSignatureUrl: signatureUrl,
            slaSignatureAcceptedAt: new Date(),
          },
        }),
        this.prisma.signatureUploadToken.update({
          where: { token },
          data: { used: true, usedAt: new Date() },
        }),
      ]);
    });
  }
}
