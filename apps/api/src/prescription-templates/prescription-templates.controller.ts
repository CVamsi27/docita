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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { PrescriptionTemplatesService } from './prescription-templates.service';

import {
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
} from './dto/prescription-templates.dto';

interface AuthRequest {
  user: {
    userId: string;
  };
}

@Controller('prescription-templates')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.PRESCRIPTION_TEMPLATES)
export class PrescriptionTemplatesController {
  constructor(
    private readonly prescriptionTemplatesService: PrescriptionTemplatesService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthRequest) {
    return this.prescriptionTemplatesService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prescriptionTemplatesService.findOne(id);
  }

  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() dto: CreatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.create(req.user.userId, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prescriptionTemplatesService.remove(id);
  }
}
