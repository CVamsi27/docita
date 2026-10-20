import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReferralPayoutStatus } from '@workspace/db';
import { InternalApiAccess } from './internal.controller.access';
import {
  createReferrerSchema,
  InternalReferralService,
  updateReferrerSchema,
} from './internal-referral.service';

@Controller('internal')
@InternalApiAccess()
export class InternalReferralController {
  constructor(private readonly referralService: InternalReferralService) {}

  @Post('referrers')
  async createReferrer(@Body() body: unknown) {
    return this.referralService.createReferrer(
      createReferrerSchema.parse(body),
    );
  }

  @Get('referrers')
  async listReferrers() {
    return this.referralService.listReferrers();
  }

  @Patch('referrers/:id')
  async updateReferrer(@Param('id') id: string, @Body() body: unknown) {
    return this.referralService.updateReferrer(
      id,
      updateReferrerSchema.parse(body),
    );
  }

  @Patch('referrers/:id/deactivate')
  async deactivateReferrer(@Param('id') id: string) {
    return this.referralService.deactivateReferrer(id);
  }

  @Post('referrers/:id/resend-welcome')
  async resendWelcome(@Param('id') id: string) {
    return this.referralService.resendWelcome(id);
  }

  @Get('referrers/:id/messages')
  async listMessages(@Param('id') id: string) {
    return this.referralService.listMessages(id);
  }

  @Get('referral-payouts')
  async listPayouts(
    @Query('status') status?: string,
    @Query('referrerId') referrerId?: string,
  ) {
    const parsedStatus = Object.values(ReferralPayoutStatus).find(
      (value) => value === status,
    );
    return this.referralService.listPayouts({
      status: parsedStatus,
      referrerId: referrerId || undefined,
    });
  }

  @Get('referral-payouts/summary')
  async payoutSummary() {
    return this.referralService.payoutSummary();
  }

  @Post('referral-payouts/:id/mark-paid')
  async markPayoutPaid(@Param('id') id: string) {
    return this.referralService.markPayoutPaid(id);
  }
}
