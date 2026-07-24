import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ReferralPayoutStatus } from '@workspace/db';
import { InternalApiAccess } from './internal.controller.access';
import {
  createReferrerSchema,
  InternalReferralService,
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
