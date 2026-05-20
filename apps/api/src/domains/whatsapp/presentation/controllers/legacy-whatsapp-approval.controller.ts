import { Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@workspace/db';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { SuccessResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappApprovalController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('approve-prescription/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SuccessResponseDto)
  async approvePrescription(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.whatsappService.approvePrescription(
      id,
      user.id,
      requireClinicId(req),
    );
  }

  @Post('approve-invoice/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SuccessResponseDto)
  async approveInvoice(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.whatsappService.approveInvoice(
      id,
      user.id,
      requireClinicId(req),
    );
  }
}
