import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MedicalDocumentsService } from './medical-documents.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

@Controller('medical-documents')
@UseGuards(TierGuard)
@RequireFeature(
  requireFeatureForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS),
)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS))
export class MedicalDocumentsController {
  constructor(private readonly service: MedicalDocumentsService) {}

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      type: string;
      patientId: string;
      appointmentId?: string;
      title: string;
      content: Record<string, unknown>;
      validFrom?: string;
      validUntil?: string;
      doctorId: string;
    },
  ) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.create({ ...body, clinicId });
  }

  @Get()
  async findAll(@Req() req: Request, @Query('patientId') patientId: string) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.findAllForPatient(clinicId, patientId);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.findOne(id, clinicId);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.update(id, clinicId, body as never);
  }

  @Patch(':id/sign')
  async sign(@Req() req: Request, @Param('id') id: string) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.sign(id, clinicId);
  }

  @Patch(':id/revoke')
  async revoke(@Req() req: Request, @Param('id') id: string) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.revoke(id, clinicId);
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const clinicId = (req.user as { clinicId: string }).clinicId;
    return this.service.delete(id, clinicId);
  }
}
