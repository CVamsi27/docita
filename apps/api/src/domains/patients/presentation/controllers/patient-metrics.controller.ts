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
import { APP_ACCESS_TARGETS, Feature } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
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
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';

@Controller('patients/:patientId/metrics')
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS))
@RequireFeature(Feature.BASIC_PATIENT_MANAGEMENT)
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
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
  async createCategory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateMetricCategoryDto,
  ) {
    const clinicId = await this.verifyPatientAccess(patientId, req);
    return this.patientMetricsService.createCategory(clinicId, dto);
  }

  @Post('definitions')
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
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
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
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
  @Roles(
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, 'write'),
  )
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
