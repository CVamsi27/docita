// check-as-cast-density: allow-file — extracting the actor id from the
// internal session user (guarded by @InternalApiAccess).
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FacilityLeadStatus } from '@workspace/db';
import { facilityLeadTransitionSchema } from '@workspace/types';
import { FacilityLeadCommandService } from '@/domains/subscriptions/core/services/facility-lead-command.service';
import { FacilityLeadQueryService } from '@/domains/subscriptions/core/services/facility-lead-query.service';
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
      'Operator facility-lead queue (newest first, optional status filter)',
  })
  async listLeads(@Query('status') status?: string) {
    const parsedStatus = Object.values(FacilityLeadStatus).find(
      (value) => value === status,
    );
    return this.queryService.listLeads({
      status: parsedStatus,
    });
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
}
