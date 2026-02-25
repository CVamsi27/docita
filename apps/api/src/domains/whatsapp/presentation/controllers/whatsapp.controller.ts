import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from '../../../../shared/modules/auth/auth/roles.guard';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { WhatsAppQueryService } from '../../application/services/whatsapp-query.service';
import { RequestWithUser } from '../../../../common/types/common.types';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
export class WhatsAppController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly queryService: WhatsAppQueryService,
  ) {}

  @Get('templates')
  async listTemplates(@Request() req: RequestWithUser) {
    return this.queryService.listTemplates(req.user!.clinicId!);
  }

  @Post('messages/send')
  async sendMessage(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      recipientPhone: string;
      templateName: string;
      variables: Record<string, string>;
      metadata?: Record<string, string | number | boolean>;
    },
  ) {
    return this.sendMessageUseCase.execute({
      clinicId: req.user!.clinicId!,
      recipientPhone: body.recipientPhone,
      templateName: body.templateName,
      variables: body.variables,
      metadata: body.metadata,
    });
  }
}
