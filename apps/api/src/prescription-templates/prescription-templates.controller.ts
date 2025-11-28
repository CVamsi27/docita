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

interface AuthRequest {
  user: {
    userId: string;
  };
}

interface MedicationData {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface CreatePrescriptionTemplateDto {
  name: string;
  medications: MedicationData[];
  instructions?: string;
}

interface UpdatePrescriptionTemplateDto {
  name?: string;
  medications?: MedicationData[];
  instructions?: string;
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
    @Body() createDto: CreatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.create(req.user.userId, createDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prescriptionTemplatesService.remove(id);
  }
}
