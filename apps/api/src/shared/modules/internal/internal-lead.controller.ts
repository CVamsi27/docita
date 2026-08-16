// check-as-cast-density: allow-file — extracting the actor id from the
// internal session user (guarded by @InternalApiAccess).
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FacilityLeadStatus } from '@workspace/db';
import {
  facilityLeadAssignSchema,
  facilityLeadTransitionSchema,
} from '@workspace/types';
import { FacilityLeadCommandService } from '@/domains/subscriptions/core/services/facility-lead-command.service';
import { FacilityLeadQueryService } from '@/domains/subscriptions/core/services/facility-lead-query.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { InternalApiAccess } from './internal.controller.access';

@ApiTags('internal-leads')
@Controller('internal')
@InternalApiAccess()
export class InternalLeadController {
  constructor(
    private readonly commandService: FacilityLeadCommandService,
    private readonly queryService: FacilityLeadQueryService,
  ) {}

  @Get('leads')
  @ApiOperation({
    summary:
      'Operator facility-lead queue (newest first; status/owner/referrer filters + cursor pagination)',
  })
  async listLeads(
    @Query('status') status?: string,
    @Query('owner') owner?: string,
    @Query('referrerId') referrerId?: string,
    @Query('lead') lead?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedStatus = Object.values(FacilityLeadStatus).find(
      (value) => value === status,
    );
    // owner accepts an operator id or the UNASSIGNED sentinel (unassigned
    // leads, i.e. ownerUserId IS NULL). Anything else is ignored.
    let ownerUserId: string | null | undefined;
    if (owner === 'UNASSIGNED') {
      ownerUserId = null;
    } else if (owner) {
      ownerUserId = owner;
    }
    return this.queryService.listLeads(
      {
        status: parsedStatus,
        ownerUserId,
        referrerId: referrerId || undefined,
        // The per-lead deep link (`/leads?lead=<id>`) narrows the queue to
        // exactly one lead.
        leadId: lead || undefined,
      },
      {
        cursor: cursor || undefined,
        limit: parsePaginationInt(limit, { min: 1, max: 100 }),
      },
    );
  }

  @Post('leads/:id/notification/ack')
  @ApiOperation({
    summary:
      'Acknowledge (mark as read) the lead notification (idempotent; first ack wins)',
  })
  async acknowledgeLeadNotification(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const actorId = (req.user as { id?: string } | undefined)?.id ?? 'internal';
    return this.commandService.acknowledgeNotification(id, actorId);
  }

  @Patch('leads/:id/status')
  @ApiOperation({
    summary:
      'Advance a lead through the lifecycle with a reason (append-only history)',
  })
  async transitionLead(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = facilityLeadTransitionSchema.safeParse(body);
    if (!parsed.success) {
      // The global filter maps only nestjs-zod exceptions; throw the
      // framework-shaped error like the other safeParse controllers.
      throw new BadRequestException('Invalid lead transition');
    }
    const actorId = (req.user as { id?: string } | undefined)?.id ?? 'internal';
    return this.commandService.transitionLead(id, actorId, parsed.data);
  }

  @Patch('leads/:id/assign')
  @ApiOperation({
    summary:
      'Assign an internal operator as the lead owner (audited, concurrency-safe)',
  })
  async assignLead(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = facilityLeadAssignSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid lead assignment');
    }
    const actorId = (req.user as { id?: string } | undefined)?.id ?? 'internal';
    return this.commandService.assignOwner(id, actorId, parsed.data);
  }

  @Get('operators')
  @ApiOperation({
    summary: 'Assignable internal operators for the lead queue',
  })
  async listOperators() {
    return this.queryService.listOperators();
  }
}
