import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { PatientMetricsService } from '@/domains/patients/application/services/patientMetrics.service';
import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';

@Controller('patients/:patientId/metrics')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class PatientMetricsController {
  constructor(
    private readonly patientService: PatientService,
    private readonly patientMetricsService: PatientMetricsService,
  ) {}

  private async verifyPatientAccess(
    patientId: string,
    req: RequestWithUser,
  ): Promise<string> {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new NotFoundException('Clinic context required');
    }

    await this.patientService.getPatient(patientId, clinicId);
    return clinicId;
  }

  @Get('categories')
  async getCategories(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.listCategories(clinicId, patientId);
  }

  @Post('categories')
  async createCategory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateMetricCategoryDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.createCategory(clinicId, dto);
  }

  @Post('definitions')
  async createDefinition(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateMetricDefinitionDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.createDefinition(
      clinicId,
      patientId,
      dto,
    );
  }

  @Get('selected')
  async getSelectedMetrics(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.getSelections(clinicId, patientId);
  }

  @Put('selected')
  async upsertSelectedMetrics(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpsertMetricSelectionsDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.upsertSelections(
      clinicId,
      patientId,
      dto,
    );
  }

  @Post('values')
  async recordMetricValue(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreatePatientMetricValueDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.recordMetricValue(
      clinicId,
      patientId,
      req.user?.id,
      dto,
    );
  }

  @Get('history')
  async getHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Query() query: MetricHistoryQueryDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.getHistory(clinicId, patientId, query);
  }
}
