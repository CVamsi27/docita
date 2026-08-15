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
import { FacilityLeadService } from '@/domains/subscriptions/core/services/facility-lead.service';
import { InternalApiAccess } from './internal.controller.access';

@ApiTags('internal-leads')
@Controller('internal')
@InternalApiAccess()
export class InternalLeadController {
  constructor(private readonly leadService: FacilityLeadService) {}

  @Get('leads')
  @ApiOperation({
    summary:
      'Operator facility-lead queue (newest first, optional status filter)',
  })
  async listLeads(@Query('status') status?: string) {
    const parsedStatus = Object.values(FacilityLeadStatus).find(
      (value) => value === status,
    );
    return this.leadService.listLeads({
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
    return this.leadService.transitionLead(id, actorId, parsed.data);
  }
}
