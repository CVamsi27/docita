import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TierGuard } from '../auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { PrescriptionTemplatesService } from './prescription-templates.service';

import {
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
  PrescriptionTemplateResponseDto,
  PrescriptionTemplateListResponseDto,
} from './dto/prescription-templates.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    userId: string;
  };
}

@Controller('prescription-templates')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
@UseGuards(TierGuard)
@RequireFeature(Feature.PRESCRIPTION_TEMPLATES)
export class PrescriptionTemplatesController {
  constructor(
    private readonly prescriptionTemplatesService: PrescriptionTemplatesService,
  ) {}

  @Get()
  @ZodSerializerDto(PrescriptionTemplateListResponseDto)
  async findAll(@Request() req: AuthRequest) {
    return this.prescriptionTemplatesService.findAll(req.user.userId);
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async findOne(@Param('id') id: string) {
    return this.prescriptionTemplatesService.findOne(id);
  }

  @Post()
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async create(
    @Request() req: AuthRequest,
    @Body() dto: CreatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.create(req.user.userId, dto);
  }

  @Put(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async remove(@Param('id') id: string) {
    return this.prescriptionTemplatesService.remove(id);
  }
}
