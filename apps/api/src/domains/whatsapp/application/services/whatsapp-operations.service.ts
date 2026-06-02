import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import type { CreateClinicWhatsappCampaignRequest } from '@workspace/types';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { PrismaWhatsappOperationsRepository } from '@/domains/whatsapp/infrastructure/repositories/prisma-whatsapp-operations.repository';

const CAMPAIGN_ROLES = new Set<Role>([Role.ADMIN, Role.ADMIN_DOCTOR]);

@Injectable()
export class WhatsappOperationsService {
  constructor(
    private readonly repository: PrismaWhatsappOperationsRepository,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  listConversations(clinicId: string) {
    return this.repository.listConversations(clinicId);
  }

  listMessages(clinicId: string, conversationId: string) {
    return this.repository.listMessages(clinicId, conversationId);
  }

  async markRead(clinicId: string, conversationId: string) {
    if (!(await this.repository.markRead(clinicId, conversationId))) {
      throw new NotFoundException('Conversation not found');
    }
    return { updated: true as const };
  }

  async reply(clinicId: string, conversationId: string, text: string) {
    const conversation = await this.repository.getConversation(
      clinicId,
      conversationId,
    );
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.sendMessage.execute({
      clinicId,
      recipientPhone: conversation.contactPhone,
      text,
    });
  }

  previewCampaign(clinicId: string, patientIds: string[], role: Role) {
    this.assertCampaignRole(role);
    return this.repository.previewCampaign(clinicId, patientIds);
  }

  async createCampaign(
    clinicId: string,
    userId: string,
    role: Role,
    input: CreateClinicWhatsappCampaignRequest,
  ) {
    this.assertCampaignRole(role);
    if (
      !(await this.repository.hasApprovedCampaignTemplate(
        clinicId,
        input.templateName,
      ))
    ) {
      throw new BadRequestException('Approved WhatsApp template not found');
    }
    return this.repository.createCampaign(clinicId, userId, input);
  }

  listCampaigns(clinicId: string) {
    return this.repository.listCampaigns(clinicId);
  }

  async cancelCampaign(
    clinicId: string,
    userId: string,
    role: Role,
    id: string,
  ) {
    this.assertCampaignRole(role);
    if (!(await this.repository.cancelCampaign(clinicId, userId, id))) {
      throw new NotFoundException('Campaign not found');
    }
    return { cancelled: true as const };
  }

  private assertCampaignRole(role: Role): void {
    if (!CAMPAIGN_ROLES.has(role)) {
      throw new ForbiddenException(
        'Only clinic administrators can manage campaigns',
      );
    }
  }
}
