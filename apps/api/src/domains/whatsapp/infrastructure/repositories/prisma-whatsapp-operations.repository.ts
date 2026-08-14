import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Prisma } from '@workspace/db';
import type { IWhatsappOperationsRepository } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import type {
  ClinicWhatsappCampaignPreviewResponse,
  ClinicWhatsappCampaignSummary,
  ClinicWhatsappConversation,
  ClinicWhatsappConversationMessage,
  CreateClinicWhatsappCampaignRequest,
} from '@workspace/types';
import { getPatientFullName } from '@workspace/utils';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return normalized.length <= 4
    ? normalized
    : `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

@Injectable()
export class PrismaWhatsappOperationsRepository implements IWhatsappOperationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async listConversations(
    clinicId: string,
  ): Promise<ClinicWhatsappConversation[]> {
    const rows = await this.prisma.whatsappConversation.findMany({
      where: { clinicId },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      patientName: row.patient ? getPatientFullName(row.patient) : null,
      maskedPhoneNumber: maskPhone(row.contactPhone),
      status: row.status,
      unreadCount: row.unreadCount,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.messages[0]?.content ?? null,
    }));
  }

  async getConversation(clinicId: string, id: string) {
    return this.prisma.whatsappConversation.findFirst({
      where: { id, clinicId },
    });
  }

  async listMessages(
    clinicId: string,
    conversationId: string,
  ): Promise<ClinicWhatsappConversationMessage[]> {
    const conversation = await this.getConversation(clinicId, conversationId);
    if (!conversation) return [];
    return this.prisma.whatsappMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        id: true,
        direction: true,
        messageType: true,
        content: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      },
    });
  }

  async markRead(clinicId: string, conversationId: string): Promise<boolean> {
    const updated = await this.prisma.whatsappConversation.updateMany({
      where: { id: conversationId, clinicId },
      data: { unreadCount: 0, lastReadAt: this.clock.now() },
    });
    return updated.count > 0;
  }

  async previewCampaign(
    clinicId: string,
    patientIds: string[],
  ): Promise<ClinicWhatsappCampaignPreviewResponse> {
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds }, clinicId, deletedAt: null },
      select: { id: true, whatsappConsent: true, phoneNumber: true },
    });
    const eligibleCount = patients.filter(
      (patient) =>
        patient.whatsappConsent && normalizePhone(patient.phoneNumber),
    ).length;
    return { eligibleCount, skippedCount: patientIds.length - eligibleCount };
  }

  async hasApprovedCampaignTemplate(
    clinicId: string,
    templateName: string,
  ): Promise<boolean> {
    const template = await this.prisma.whatsappTemplate.findFirst({
      where: {
        name: templateName,
        status: 'APPROVED',
        isActive: true,
        OR: [{ clinicId }, { clinicId: null }],
      },
      select: { id: true },
    });
    return Boolean(template);
  }

  async createCampaign(
    clinicId: string,
    userId: string,
    input: CreateClinicWhatsappCampaignRequest,
  ): Promise<ClinicWhatsappCampaignSummary> {
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: input.patientIds }, clinicId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.whatsAppBroadcastJob.create({
        data: {
          clinicId,
          title: input.title,
          templateName: input.templateName,
          languageCode: input.languageCode,
          source: 'CLINIC',
          status: 'PENDING',
          createdBy: userId,
          totalCount: patients.length,
          recipients: {
            create: patients.map((patient) => {
              const eligible =
                patient.whatsappConsent &&
                Boolean(normalizePhone(patient.phoneNumber));
              return {
                patientId: patient.id,
                phoneNumber: normalizePhone(patient.phoneNumber),
                name: getPatientFullName(patient),
                whatsappConsentAt: patient.whatsappConsentAt,
                status: eligible ? ('PENDING' as const) : ('SKIPPED' as const),
                skipReason: eligible ? null : 'WhatsApp consent missing',
              };
            }),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          clinicId,
          userId,
          action: 'whatsapp.campaign.create',
          entityType: 'WhatsAppBroadcastJob',
          entityId: created.id,
          oldValue: Prisma.JsonNull,
          newValue: { title: input.title, recipientCount: patients.length },
          metadata: Prisma.JsonNull,
        },
      });
      return created;
    });
    return this.toCampaignSummary(job);
  }

  async listCampaigns(
    clinicId: string,
  ): Promise<ClinicWhatsappCampaignSummary[]> {
    const jobs = await this.prisma.whatsAppBroadcastJob.findMany({
      where: { clinicId, source: 'CLINIC' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return jobs.map((job) => this.toCampaignSummary(job));
  }

  async cancelCampaign(
    clinicId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.whatsAppBroadcastJob.updateMany({
        where: {
          id,
          clinicId,
          source: 'CLINIC',
          status: { in: ['PENDING', 'RUNNING'] },
        },
        data: { status: 'CANCELLED', cancelRequestedAt: this.clock.now() },
      });
      if (updated.count > 0) {
        await tx.auditLog.create({
          data: {
            clinicId,
            userId,
            action: 'whatsapp.campaign.cancel',
            entityType: 'WhatsAppBroadcastJob',
            entityId: id,
            oldValue: Prisma.JsonNull,
            newValue: { status: 'CANCELLED' },
            metadata: Prisma.JsonNull,
          },
        });
      }
      return updated.count > 0;
    });
  }

  private toCampaignSummary(job: {
    id: string;
    title: string;
    templateName: string | null;
    totalCount: number;
    sentCount: number;
    failedCount: number;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    createdAt: Date;
    completedAt: Date | null;
  }): ClinicWhatsappCampaignSummary {
    return {
      id: job.id,
      title: job.title,
      templateName: job.templateName,
      totalCount: job.totalCount,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
