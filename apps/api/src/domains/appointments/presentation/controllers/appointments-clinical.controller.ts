import { Controller, Post, Patch, Param, Request, Body } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import {
  VitalsDto,
  DiagnosesSyncDto,
  DiagnosesSyncResponseDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import { AppointmentsApiAccess } from '@/domains/appointments/presentation/controllers/appointments.controller.access';
import { getAppointmentAccessContext } from '@/domains/appointments/application/types/appointment-access-context';

function stripVitalsMetadata(
  body: VitalsDto,
): Omit<VitalsDto, 'id' | 'appointmentId' | 'createdAt' | 'updatedAt'> {
  const {
    id: _id,
    appointmentId: _appointmentId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...vitals
  } = body;
  return vitals;
}

@ApiTags('appointments')
@Controller('appointments')
@AppointmentsApiAccess()
export class AppointmentsClinicalController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post(':id/vitals')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
  @ApiOperation({ summary: 'Create or update appointment vitals' })
  @ZodSerializerDto(VitalsDto)
  async createVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    return this.appointmentService.createVitals(
      id,
      requireClinicIdFromRequest(req),
      stripVitalsMetadata(body),
      getAppointmentAccessContext(req),
    );
  }

  @Patch(':id/vitals')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
  @ApiOperation({ summary: 'Patch appointment vitals' })
  @ZodSerializerDto(VitalsDto)
  async updateVitals(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: VitalsDto,
  ) {
    return this.appointmentService.updateVitals(
      id,
      requireClinicIdFromRequest(req),
      stripVitalsMetadata(body),
      getAppointmentAccessContext(req),
    );
  }

  @Post(':id/diagnoses')
  @ApiOperation({ summary: 'Sync ICD-10 diagnoses for an appointment' })
  @ZodSerializerDto(DiagnosesSyncResponseDto)
  async syncDiagnoses(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: DiagnosesSyncDto,
  ): Promise<DiagnosesSyncResponseDto> {
    const result = await this.appointmentService.syncDiagnoses(
      id,
      requireClinicIdFromRequest(req),
      body.diagnoses ?? [],
      body.contentHash,
    );
    return {
      success: true,
      contentHash: result.contentHash,
      skipped: result.skipped,
      count: result.count,
    };
  }
}
