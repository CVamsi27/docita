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
  UsePipes,
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
  CreatePrescriptionTemplateSchema,
  UpdatePrescriptionTemplateSchema,
} from './dto/prescription-templates.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

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
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.prescriptionTemplatesService.findOne(id, req.user.userId);
  }

  @Post()
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionTemplateSchema))
  async create(
    @Request() req: AuthRequest,
    @Body() dto: CreatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.create(req.user.userId, dto);
  }

  @Put(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  @UsePipes(new ZodValidationPipe(UpdatePrescriptionTemplateSchema))
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.prescriptionTemplatesService.remove(id, req.user.userId);
  }
}
