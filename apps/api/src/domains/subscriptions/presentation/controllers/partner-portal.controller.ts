// check-as-cast-density: allow-file — narrowing Zod-parsed query/status
// enums to the Prisma enum and pulling the partner context off the
// request via the guard-set symbol; replacing either with a predicate
// would duplicate the guard or the schema.
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ReferralPayoutStatus, ReferralStatus } from '@workspace/db';
import {
  facilityLeadSubmitSchema,
  type FacilityLeadView,
  referrerPayoutDetailsInputSchema,
  type PartnerMe,
  type ReferrerPayoutDetailsView,
  type PartnerPayoutRow,
  type PartnerReferralRow,
} from '@workspace/types';
import { PartnerPortalService } from '../../core/services/partner-portal.service';
import { FacilityLeadService } from '../../core/services/facility-lead.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  PARTNER_AUTH_REQUEST_KEY,
  PartnerAuthGuard,
  type PartnerAuthRequestContext,
} from '../guards/partner-auth.guard';

const READ_RATE_LIMIT = {
  short: { ttl: 60_000, limit: 60 },
} as const;

const WRITE_RATE_LIMIT = {
  short: { ttl: 60_000, limit: 20 },
} as const;

@ApiTags('partner-portal')
// The partner portal authenticates with its own bearer token via
// PartnerAuthGuard (audience = "partner"), not the staff session JWT. Mark
// the surface public so the global session guards (JWT/roles/subscription/
// policy) skip it — without this, the global JwtAuthGuard rejects the
// partner token first and every route 401s as "User not found".
@Public()
@UseGuards(PartnerAuthGuard)
@Controller('partner')
export class PartnerPortalController {
  constructor(
    private readonly portal: PartnerPortalService,
    private readonly leadService: FacilityLeadService,
  ) {}

  @Get('me')
  @Throttle(READ_RATE_LIMIT)
  @ApiOperation({
    summary: 'Resolve the partner profile + counts + share URLs',
  })
  async getMe(@Req() req: Request): Promise<PartnerMe> {
    const { referrerId } = this.context(req);
    return this.portal.getMe(referrerId);
  }

  @Get('me/payouts')
  @Throttle(READ_RATE_LIMIT)
  @ApiOperation({ summary: 'Paginated payouts for the partner' })
  async getPayouts(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ): Promise<{ items: PartnerPayoutRow[]; nextCursor: string | null }> {
    const { referrerId } = this.context(req);
    const parsedStatus = status
      ? (Object.values(ReferralPayoutStatus) as string[]).find(
          (value) => value === status,
        )
      : undefined;
    const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50;
    return this.portal.listPayouts(referrerId, {
      ...(typeof parsedStatus === 'string'
        ? { status: parsedStatus as ReferralPayoutStatus }
        : {}),
      limit,
      cursor,
    });
  }

  @Get('me/referrals')
  @Throttle(READ_RATE_LIMIT)
  @ApiOperation({ summary: 'Paginated referred clinics for the partner' })
  async getReferrals(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ): Promise<{ items: PartnerReferralRow[]; nextCursor: string | null }> {
    const { referrerId } = this.context(req);
    const parsedStatus = status
      ? (Object.values(ReferralStatus) as string[]).find(
          (value) => value === status,
        )
      : undefined;
    const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50;
    return this.portal.listReferrals(referrerId, {
      ...(typeof parsedStatus === 'string'
        ? { status: parsedStatus as ReferralStatus }
        : {}),
      limit,
      cursor,
    });
  }

  @Put('me/payout-details')
  @Throttle(WRITE_RATE_LIMIT)
  @ApiOperation({ summary: 'Upsert the partner banking / payout details' })
  async putPayoutDetails(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<ReferrerPayoutDetailsView> {
    const { referrerId } = this.context(req);
    const parsed = referrerPayoutDetailsInputSchema.safeParse(body);
    if (!parsed.success) {
      // Re-throw as the framework-shaped error so the validation message
      // is surfaced; ZodError → NestJS BadRequest handled globally.
      throw parsed.error;
    }
    return this.portal.upsertPayoutDetails(referrerId, parsed.data);
  }

  @Post('me/leads')
  @HttpCode(200)
  @Throttle(WRITE_RATE_LIMIT)
  @ApiOperation({
    summary:
      'Submit a facility lead (prospective customer) for Docita follow-up',
  })
  async submitLead(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<FacilityLeadView> {
    const { referrerId } = this.context(req);
    const parsed = facilityLeadSubmitSchema.safeParse(body);
    if (!parsed.success) {
      // The global filter maps only nestjs-zod exceptions; throw the
      // framework-shaped error like the other safeParse controllers.
      throw new BadRequestException('Invalid lead submission');
    }
    return this.leadService.submitLead(referrerId, parsed.data);
  }

  @Get('me/share-message')
  @Throttle(READ_RATE_LIMIT)
  @ApiOperation({
    summary: 'Render the copy-paste share message with the partner code',
  })
  async getShareMessage(@Req() req: Request): Promise<{ message: string }> {
    const { referrerId } = this.context(req);
    return this.portal.getShareMessage(referrerId);
  }

  @Get('me/showcase-pdf')
  @Throttle(READ_RATE_LIMIT)
  @Header('content-type', 'application/pdf')
  @ApiOperation({ summary: 'Stream the Docita showcase PDF' })
  async getShowcasePdf(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { referrerId } = this.context(req);
    const buffer = await this.portal.renderShowcasePdf(referrerId);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader(
      'content-disposition',
      'inline; filename="docita-partner-showcase.pdf"',
    );
    res.setHeader('content-length', buffer.length.toString());
    res.status(200).end(buffer);
  }

  private context(req: Request): PartnerAuthRequestContext {
    const ctx = (req as Request & Record<string, unknown>)[
      PARTNER_AUTH_REQUEST_KEY
    ] as PartnerAuthRequestContext | undefined;
    if (!ctx) {
      // Guard should have populated this. If we got here, the guard
      // misconfiguration is a server bug, not a user error.
      throw new Error('PartnerAuthGuard did not populate request context');
    }
    return ctx;
  }
}
