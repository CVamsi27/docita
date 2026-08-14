import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateClinicWhatsappCampaignRequest,
  UserRole,
} from '@workspace/types';
import { CLINIC_ADMIN_ROLES } from '@/shared/common/constants/role-groups';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  type IWhatsappOperationsRepository,
  WHATSAPP_OPERATIONS_REPOSITORY_TOKEN,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';

@Injectable()
export class WhatsappOperationsService {
  constructor(
    @Inject(WHATSAPP_OPERATIONS_REPOSITORY_TOKEN)
    private readonly repository: IWhatsappOperationsRepository,
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

  previewCampaign(clinicId: string, patientIds: string[], role: UserRole) {
    this.assertCampaignRole(role);
    return this.repository.previewCampaign(clinicId, patientIds);
  }

  async createCampaign(
    clinicId: string,
    userId: string,
    role: UserRole,
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
    role: UserRole,
    id: string,
  ) {
    this.assertCampaignRole(role);
    if (!(await this.repository.cancelCampaign(clinicId, userId, id))) {
      throw new NotFoundException('Campaign not found');
    }
    return { cancelled: true as const };
  }

  private assertCampaignRole(role: UserRole): void {
    if (!CLINIC_ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only clinic administrators can manage campaigns',
      );
    }
  }
}
