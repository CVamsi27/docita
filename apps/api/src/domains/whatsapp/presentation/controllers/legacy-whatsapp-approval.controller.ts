import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequirePolicy } from '@/shared/modules/auth/decorators/require-policy.decorator';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { SuccessResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/require-clinic-id';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappApprovalController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('approve-prescription/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @RequirePolicy('prescription', 'update')
  @ZodSerializerDto(SuccessResponseDto)
  async approvePrescription(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const userId = getAuthenticatedUserId(req.user);
    if (!userId) throw new ForbiddenException('Authenticated user required');
    return this.whatsappService.approvePrescription(
      id,
      userId,
      requireClinicId(req),
    );
  }

  @Post('approve-invoice/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @ZodSerializerDto(SuccessResponseDto)
  async approveInvoice(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = getAuthenticatedUserId(req.user);
    if (!userId) throw new ForbiddenException('Authenticated user required');
    return this.whatsappService.approveInvoice(
      id,
      userId,
      requireClinicId(req),
    );
  }
}
