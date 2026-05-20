import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Prisma, SignaturePurpose } from '@workspace/db';
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findUserById(userId: string) {
    return this.getReadClient().user.findFirst({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
  }

  async findClinicById(clinicId: string) {
    return this.getReadClient().clinic.findUnique({
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
    return this.prisma.signatureUploadToken.create({
      data: {
        doctorId: data.doctorId,
        clinicId: data.clinicId ?? null,
        token: data.token,
        expiresAt: data.expiresAt,
        purpose: data.purpose,
      } satisfies Prisma.SignatureUploadTokenUncheckedCreateInput,
    });
  }

  async findTokenByValue(
    token: string,
  ): Promise<UploadTokenWithRelations | null> {
    // RLS-BYPASS: signature upload persistence uses storage keys outside clinic RLS
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
      });
    });
  }

  async findTokenById(id: string, doctorId: string) {
    return this.getReadClient().signatureUploadToken.findFirst({
      where: { id, doctorId },
    });
  }

  async findClinicTokenById(id: string, clinicId: string) {
    return this.getReadClient().signatureUploadToken.findFirst({
      where: { id, clinicId },
    });
  }

  async findActiveTokensByDoctor(
    doctorId: string,
  ): Promise<ActiveTokenSummary[]> {
    return this.getReadClient().signatureUploadToken.findMany({
      where: {
        doctorId,
        purpose: SignaturePurpose.DOCTOR_PRESCRIPTION,
        used: false,
        expiresAt: { gt: this.clock.now() },
      },
      orderBy: { createdAt: 'desc' },
      select: ACTIVE_TOKEN_SELECT,
    });
  }

  async findActiveTokensByClinic(
    clinicId: string,
  ): Promise<ActiveTokenSummary[]> {
    return this.getReadClient().signatureUploadToken.findMany({
      where: {
        clinicId,
        purpose: SignaturePurpose.SLA_ACCEPTANCE,
        used: false,
        expiresAt: { gt: this.clock.now() },
      },
      orderBy: { createdAt: 'desc' },
      select: ACTIVE_TOKEN_SELECT,
    });
  }

  async markTokenUsed(token: string): Promise<void> {
    const now = this.clock.now();
    await this.prisma.signatureUploadToken.update({
      where: { token },
      data: { used: true, usedAt: now },
    });
  }

  async markTokenUsedById(id: string): Promise<void> {
    const now = this.clock.now();
    await this.prisma.signatureUploadToken.update({
      where: { id },
      data: { used: true, usedAt: now },
    });
  }

  async updateDoctorSignature(
    doctorId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void> {
    const now = this.clock.now();
    // RLS-BYPASS: signature upload persistence uses storage keys outside clinic RLS
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: doctorId },
          data: { signatureUrl, signatureUploadedAt: now },
        }),
        this.prisma.signatureUploadToken.update({
          where: { token },
          data: { used: true, usedAt: now },
        }),
      ]);
    });
  }

  async updateClinicSignature(
    clinicId: string,
    signatureUrl: string,
    token: string,
  ): Promise<void> {
    const now = this.clock.now();
    // RLS-BYPASS: signature upload persistence uses storage keys outside clinic RLS
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.$transaction([
        this.prisma.clinic.update({
          where: { id: clinicId },
          data: {
            slaSignatureUrl: signatureUrl,
            slaSignatureAcceptedAt: now,
          },
        }),
        this.prisma.signatureUploadToken.update({
          where: { token },
          data: { used: true, usedAt: now },
        }),
      ]);
    });
  }
}
