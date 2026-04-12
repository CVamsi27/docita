import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  Query,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrescriptionsService } from '@/domains/prescriptions/application/services/prescription.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role, Specialization, HospitalRole } from '@workspace/db';
import {
  CreatePrescriptionDto,
  ListPrescriptionsQueryDto,
  PrescriptionResponseDto,
  PrescriptionListResponseDto,
  CreatePrescriptionSchema,
} from '@/domains/prescriptions/application/dto/prescription.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
  };
}

@Controller('prescriptions')
@UseGuards(TierGuard)
@RequireFeature(Feature.DIGITAL_PRESCRIPTIONS)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ZodSerializerDto(PrescriptionListResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query() query?: ListPrescriptionsQueryDto,
  ) {
    const { search, date } = query ?? {};
    return this.prescriptionsService.findAll(req.user.clinicId, {
      search,
      date,
    });
  }

  @Get(':id')
  @ZodSerializerDto(PrescriptionResponseDto)
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.prescriptionsService.findOne(id, req.user.clinicId);
  }

  @Post()
  @ZodSerializerDto(PrescriptionResponseDto)
  @UsePipes(new ZodValidationPipe(CreatePrescriptionSchema))
  create(@Request() req: AuthRequest, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create({
      ...dto,
      appointmentId: dto.appointmentId || '',
      doctorId: dto.doctorId || req.user.id,
      doctorSpecialization: dto.doctorSpecialization as Specialization,
      doctorRole: dto.doctorRole as HospitalRole,
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id/pdf')
  async getPdf(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.prescriptionsService.getPdf(
      id,
      req.user.clinicId,
    );

    if (result.type === 'url') {
      return res.json({ url: result.url });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=prescription-${id}.pdf`,
      'Content-Length': result.buffer.length,
    });
    res.end(result.buffer);
  }
}
