import { Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { SuccessResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicActor } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappResendController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('resend-prescription/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async resendPrescription(@Req() req: Request, @Param('id') id: string) {
    const { clinicId, id: userId, role } = requireClinicActor(req);
    return this.whatsappService.resendPrescription(clinicId, userId, role, id);
  }

  @Post('resend-invoice/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async resendInvoice(@Req() req: Request, @Param('id') id: string) {
    const { clinicId, id: userId, role } = requireClinicActor(req);
    return this.whatsappService.resendInvoice(clinicId, userId, role, id);
  }
}
