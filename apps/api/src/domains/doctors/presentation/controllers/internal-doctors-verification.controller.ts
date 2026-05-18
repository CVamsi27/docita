import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { RequestWithUser } from '@/shared/common/types/common.types';

const AdminVerifySchema = z.object({
  note: z.string().trim().max(500).optional(),
});
type AdminVerifyDto = z.infer<typeof AdminVerifySchema>;

const AdminRejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
type AdminRejectDto = z.infer<typeof AdminRejectSchema>;

@Controller('internal/doctors')
@UseGuards(TierGuard)
@Roles(Role.INTERNAL)
export class InternalDoctorsVerificationController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('verification-queue')
  async listQueue() {
    return this.doctorsService.listDoctorsForAdminReview();
  }

  @Post(':id/admin-verify')
  async adminVerify(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminVerifySchema)) dto: AdminVerifyDto,
  ) {
    return this.doctorsService.adminVerifyDoctor(id, req.user!.id, dto.note);
  }

  @Post(':id/admin-reject')
  async adminReject(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminRejectSchema)) dto: AdminRejectDto,
  ) {
    return this.doctorsService.adminRejectDoctor(id, req.user!.id, dto.reason);
  }
}
