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
  ForbiddenException,
} from '@nestjs/common';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { RequestWithUser } from '@/common/types/common.types';

import {
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
  PrescriptionTemplateResponseDto,
  PrescriptionTemplateListResponseDto,
  CreatePrescriptionTemplateSchema,
  UpdatePrescriptionTemplateSchema,
} from './dto/prescription-templates.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

interface _AuthRequest {
  user: {
    userId: string;
  };
}

@Controller('prescription-templates')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
@RequireFeature(Feature.PRESCRIPTION_TEMPLATES)
export class PrescriptionTemplatesController {
  constructor(
    private readonly prescriptionTemplatesService: PrescriptionTemplatesService,
  ) {}

  @Get()
  @ZodSerializerDto(PrescriptionTemplateListResponseDto)
  async findAll(@Request() req: RequestWithUser) {
    if (!req.user?.id) throw new ForbiddenException('User session required');
    return this.prescriptionTemplatesService.findAll(req.user.id);
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user?.id) throw new ForbiddenException('User session required');
    return this.prescriptionTemplatesService.findOne(id, req.user.id);
  }

  @Post()
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionTemplateSchema))
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreatePrescriptionTemplateDto,
  ) {
    if (!req.user?.id) throw new ForbiddenException('User session required');
    return this.prescriptionTemplatesService.create(req.user.id, dto);
  }

  @Put(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  @UsePipes(new ZodValidationPipe(UpdatePrescriptionTemplateSchema))
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
  ) {
    if (!req.user?.id) throw new ForbiddenException('User session required');
    return this.prescriptionTemplatesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ZodSerializerDto(PrescriptionTemplateResponseDto)
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user?.id) throw new ForbiddenException('User session required');
    return this.prescriptionTemplatesService.remove(id, req.user.id);
  }
}
