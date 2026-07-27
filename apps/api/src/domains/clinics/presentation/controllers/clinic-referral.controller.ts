import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  applyReferralCodeRequestSchema,
  type ApplyReferralCodeResponse,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { ReferralService } from '@/domains/subscriptions/core/services/referral.service';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';

/**
 * Clinic-side referral endpoints. Sits next to the existing clinic
 * settings but kept separate so the routes can be throttled + have
 * a distinct auth surface from the rest of clinic settings.
 *
 * The `apply` endpoint covers the settings-page flow: a clinic admin
 * pastes a code (Referrer or legacy clinic) and we link it. The
 * onboarding flow already routes through `ReferralService.captureReferralAtSignup`
 * via the `CLINIC_ONBOARDED` application event, so this controller
 * only handles the post-onboarding / late-apply case.
 */
@ApiTags('clinic-referral')
@Controller('clinic/referral')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
@UsePipes(ZodValidationPipe)
export class ClinicReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  @ApiOperation({ summary: 'Read the current referral status for this clinic' })
  async getStatus(@Req() req: RequestWithUser): Promise<{
    code: string | null;
    source: 'PARTNER' | 'CLINIC' | null;
    status: 'PENDING' | 'SIGNED_UP' | 'CONVERTED' | 'REJECTED' | 'EXPIRED' | null;
    discountApplied: boolean;
  }> {
    const clinicId = this.requireClinicId(req);
    return this.referralService.getClinicReferralStatus(clinicId);
  }

  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @Post('apply')
  @ApiOperation({ summary: 'Apply a referral code from the clinic settings page' })
  async apply(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ): Promise<ApplyReferralCodeResponse> {
    const clinicId = this.requireClinicId(req);
    const parsed = applyReferralCodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return {
        applied: false,
        message: 'Invalid referral code format',
      };
    }
    const result = await this.referralService.applyReferralCodeAtSettings(
      clinicId,
      parsed.data.code,
    );
    if (result.applied) {
      return {
        applied: true,
        source: result.source,
        referrerId: result.referrerId,
        clinicId: result.clinicId,
        message:
          result.source === 'PARTNER'
            ? 'Referral applied. You will see a discount on your next invoice.'
            : 'Referral applied. You will see a discount on your next invoice.',
      };
    }
    switch (result.reason) {
      case 'ALREADY_LINKED':
        return {
          applied: false,
          message: 'This clinic already has a referral code applied.',
        };
      case 'SELF':
        return {
          applied: false,
          message: 'You cannot refer yourself.',
        };
      case 'INVALID':
      default:
        return {
          applied: false,
          message: 'Invalid referral code.',
        };
    }
  }

  private requireClinicId(req: RequestWithUser): string {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new ForbiddenException('No clinic assigned to this user');
    }
    return clinicId;
  }
}
