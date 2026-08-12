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
import { ApprovalService } from '@/domains/whatsapp/application/services/approval.service';
import { SuccessResponseDto } from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/require-clinic-id';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

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
    return this.approvalService.approvePrescription(
      id,
      userId,
      requireClinicId(req),
    );
  }

  // C4.3 (resolves C3.1): unlike approve-prescription (author-pinned in C3),
  // approve-invoice stays clinic-wide — the legacy InvoicePolicy has no
  // doctor author-of-record branch, so any clinic DOCTOR/ADMIN/ADMIN_DOCTOR
  // may approve any clinic invoice. The policy adds tenant discipline only.
  @Post('approve-invoice/:id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  @RequirePolicy('invoice', 'update')
  @ZodSerializerDto(SuccessResponseDto)
  async approveInvoice(@Req() req: RequestWithUser, @Param('id') id: string) {
    const userId = getAuthenticatedUserId(req.user);
    if (!userId) throw new ForbiddenException('Authenticated user required');
    return this.approvalService.approveInvoice(
      id,
      userId,
      requireClinicId(req),
    );
  }
}
